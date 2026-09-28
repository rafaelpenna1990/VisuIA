import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      credits_balance: user.credits_balance,
      // Contas Google-only (nunca definiram senha) têm password_hash
      // vazio — o front usa isso pra decidir se pede "senha atual" na
      // tela de trocar senha.
      has_password: !!user.password_hash,
    },
  });
}
