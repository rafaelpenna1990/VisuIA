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

  if (job.status === 'completed') {
    return NextResponse.json({ done: true, url: job.output_url, charged_brl: job.cost_credits });
  }
  if (job.status === 'failed') {
    return NextResponse.json({ done: true, error: 'A geração falhou.' });
  }

  let result;
  try {
    result = await checkGeneration(job.request_id, MUAPI_KEY);
  } catch (err) {
    settleGenerationFailure(job.id);
    return NextResponse.json({ done: true, error: `Falha na geração: ${err.message}` });
  }

  if (!result.done) {
    return NextResponse.json({ done: false });
  }

  // TEMPORARY DEBUG: print Muapi's raw response to the Railway logs so we
  // can see exactly which field the video URL comes back in. Safe to
  // remove once the URL-extraction logic in muapi.js is confirmed correct.
  console.log('[poll] raw Muapi response:', JSON.stringify(result.raw));

  const realCharge = actualChargeBRL(result.raw, job.kind);
  settleGenerationSuccess(job.id, realCharge, result.url);
  return NextResponse.json({ done: true, url: result.url, charged_brl: realCharge });
}