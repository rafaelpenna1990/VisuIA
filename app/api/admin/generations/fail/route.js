import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { getGenerationById, settleGenerationFailure, settleGenerationSuccess } from '../../../../../lib/db.js';
import { actualChargeBRL } from '../../../../../lib/pricing.js';
import { checkGeneration } from '../../../../../packages/studio/src/muapi.js';

const MUAPI_KEY = process.env.MUAPI_API_KEY;

// Manually resolves a generation stuck in "pending" — this happens when
// the person closes the tab/app before the client finishes polling Muapi,
// or the client just gives up after its ~30min polling budget without the
// server ever hearing why.
//
// Before giving up on it, this does ONE more check against Muapi itself
// (the same check /api/generate/poll does on every normal poll) — a job
// that's "stuck" on our side has very often already finished on Muapi's
// side, and the video is sitting there waiting to be picked up. Blindly
// refunding and marking it failed, like this used to do unconditionally,
// would throw that finished video away for good — there's no "Corrigir"
// for a "Corrigir" that already ran. So:
//   - Muapi says it's actually done → settle as a real success (true-up
//     charge, save the output URL) so the person gets their video.
//   - Muapi says it's still going, or genuinely failed/errored → fall
//     back to the old behavior: refund the estimate and mark it failed.
//     No error message is passed in that case on purpose —
//     settleGenerationFailure automatically falls back to the last raw
//     status Muapi gave this job (captured on every poll) if one was
//     recorded, so the real reason still shows up in the admin Erros tab
//     instead of being blank.
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { generationId } = await request.json();
  if (!generationId) {
    return NextResponse.json({ error: 'generationId obrigatório' }, { status: 400 });
  }
  const job = getGenerationById(Number(generationId));
  if (!job) return NextResponse.json({ error: 'Geração não encontrada' }, { status: 404 });
  if (job.status !== 'pending') {
    return NextResponse.json({ error: `Essa geração já está com status "${job.status}", nada a fazer` }, { status: 400 });
  }

  let result = null;
  try {
    result = await checkGeneration(job.request_id, MUAPI_KEY);
  } catch (err) {
    // Genuinely failed on Muapi's side (e.g. status === 'failed'/'error') —
    // fall through to the refund-and-fail path below with the real reason.
    const updated = settleGenerationFailure(job.id, err.message);
    return NextResponse.json({ ok: true, generation: updated, recovered: false });
  }

  if (result?.done) {
    const realCharge = actualChargeBRL(result.raw, job.kind, job.model);
    const updated = settleGenerationSuccess(job.id, realCharge, result.url);
    return NextResponse.json({ ok: true, generation: updated, recovered: true });
  }

  // Still not done (or a transient error) per Muapi — this really is stuck.
  const updated = settleGenerationFailure(job.id);
  return NextResponse.json({ ok: true, generation: updated, recovered: false });
}
