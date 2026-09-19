import { NextResponse } from 'next/server';
import { getUserByEmail } from '../../../../lib/db.js';
import { verifyPassword, createSessionToken, setSessionCookie } from '../../../../lib/auth.js';

export async function POST(request) {
  const { email, password } = await request.json();

  const user = getUserByEmail(email);
  if (!user || !user.password_hash) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
  }

  const token = createSessionToken(user.id);
  await setSessionCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, credits_balance: user.credits_balance },
  });
}
