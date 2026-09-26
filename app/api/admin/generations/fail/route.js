import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { getGenerationById, settleGenerationFailure } from '../../../../../lib/db.js';

// Manually resolves a generation stuck in "pending" — this happens when
// the person closes the tab/app before the client finishes polling
// Muapi (or the client gives up after its ~30min polling budget without
// ever telling the server why), and never comes back to trigger the
// auto-resume. Refunds the pre-charged estimate back to their balance
// and marks it failed.
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

  // Ficou "pending" e nunca foi resolvida automaticamente — o cliente
  // deu por vencido de tentar (ou a pessoa fechou a aba) sem o servidor
  // nunca saber o motivo real da Muapi. Registramos isso explicitamente
  // em vez de deixar error_message em branco, pra aparecer certo na
  // aba Erros do admin.
  const updated = settleGenerationFailure(
    job.id,
    'Corrigido manualmente pelo admin — geração ficou "pending" sem resposta da Muapi (provável timeout ou falha silenciosa)'
  );
  return NextResponse.json({ ok: true, generation: updated });
}
