import { NextResponse } from 'next/server';
import {
  getValidPasswordResetToken,
  consumePasswordResetToken,
  adminSetPassword,
} from '../../../../lib/db.js';
import { hashPassword } from '../../../../lib/auth.js';

export async function POST(request) {
  const { token, password } = await request.json();

  if (!token || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Link inválido ou senha muito curta (mínimo 8 caracteres)' },
      { status: 400 }
    );
  }

  const resetRow = getValidPasswordResetToken(token);
  if (!resetRow) {
    return NextResponse.json(
      { error: 'Esse link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".' },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  adminSetPassword(resetRow.user_id, passwordHash);
  consumePasswordResetToken(token);

  return NextResponse.json({ ok: true });
}
