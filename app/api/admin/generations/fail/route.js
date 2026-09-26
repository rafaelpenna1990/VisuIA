import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { getGenerationById, settleGenerationFailure } from '../../../../../lib/db.js';

// Manually resolves a generation stuck in "pending" — this happens when
// the person closes the tab/app before the client finishes polling
// Muapi, or the client just gives up after its ~30min polling budget
// without the server ever hearing why. Refunds the pre-charged estimate
// back to their balance and marks it failed.
//
// No error message is passed here on purpose — settleGenerationFailure
// automatically falls back to the last raw status Muapi gave this job
// (captured on every poll) if one was recorded, so the real reason still
// shows up in the admin Erros tab instead of being blank.
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

  const updated = settleGenerationFailure(job.id);
  return NextResponse.json({ ok: true, generation: updated });
}
