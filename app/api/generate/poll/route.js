import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';
import {
  getGenerationById,
  settleGenerationSuccess,
  settleGenerationFailure,
} from '../../../../lib/db.js';
import { actualChargeBRL } from '../../../../lib/pricing.js';
import { checkGeneration } from '../../../../packages/studio/src/muapi.js';

const MUAPI_KEY = process.env.MUAPI_API_KEY;

// The client calls this every few seconds after /api/generate returns
// { done: false, job_id }. Each call does at most ONE check against
// Muapi — fast, never at risk of a proxy timeout.
export async function GET(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const jobId = Number(request.nextUrl.searchParams.get('job_id'));
  if (!jobId) {
    return NextResponse.json({ error: 'job_id ausente' }, { status: 400 });
  }

  const job = getGenerationById(jobId);
  if (!job || job.user_id !== user.id) {
    return NextResponse.json({ error: 'Geração não encontrada' }, { status: 404 });
  }

  // Already settled (e.g. the browser polled again after finishing, or a
  // second tab is open) — just hand back the stored result, don't touch
  // Muapi or the balance again.
  if (job.status === 'completed') {
    return NextResponse.json({ done: true, url: job.output_url, charged_brl: job.cost_credits });
  }
  if (job.status === 'failed') {
    return NextResponse.json({ done: true, error: 'A geração falhou.' });
  }

  // Still pending — check once.
  let result;
  try {
    result = await checkGeneration(job.request_id, MUAPI_KEY);
  } catch (err) {
    settleGenerationFailure(job.id);
    return NextResponse.json({ done: true, error: `Falha na geração: ${err.message}` });
  }

  if (!result.done) {
    // A 400/404 gets a short grace period (some Muapi tools answer this
    // way for the first few seconds before the job is fully registered)
    // — but if it's STILL happening 20+ seconds after the job was created,
    // it's not transient, it's a real failure, and waiting the full
    // 30-minute poll budget on it would just leave the person staring at
    // "Gerando…" for no reason. Settle it now instead.
    if (result.transientError) {
      const ageMs = Date.now() - new Date(job.created_at).getTime();
      if (ageMs > 20_000) {
        settleGenerationFailure(job.id);
        return NextResponse.json({
          done: true,
          error: `Falha na geração: a Muapi não conseguiu processar esse pedido (${result.transientError.slice(0, 200)})`,
        });
      }
    }
    return NextResponse.json({ done: false });
  }

  // TEMPORARY DEBUG: print Muapi's raw response to the Railway logs so we
  // can see exactly which field the video URL comes back in. Safe to
  // remove once the URL-extraction logic in muapi.js is confirmed correct.
  console.log('[poll] raw Muapi response:', JSON.stringify(result.raw));

  const realCharge = actualChargeBRL(result.raw, job.kind, job.model);
  settleGenerationSuccess(job.id, realCharge, result.url);
  return NextResponse.json({ done: true, url: result.url, charged_brl: realCharge });
}
