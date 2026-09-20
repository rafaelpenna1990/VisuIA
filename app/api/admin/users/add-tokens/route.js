import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { addCredits, getUserById } from '../../../../../lib/db.js';

// Body: { userId, tokens } — tokens is VisuTokens (100 = R$1), converted
// to reais internally, same unit the rest of the app already uses.
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { userId, tokens } = await request.json();
  const tokensNum = Number(tokens);
  if (!userId || !Number.isFinite(tokensNum) || tokensNum === 0) {
    return NextResponse.json({ error: 'Informe o usuário e uma quantidade de tokens' }, { status: 400 });
  }
  const user = getUserById(Number(userId));
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  addCredits(user.id, tokensNum / 100, 'Ajuste manual (admin)');
  const updated = getUserById(user.id);
  return NextResponse.json({ ok: true, newBalance: updated.credits_balance });
}
