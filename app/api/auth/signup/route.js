import { NextResponse } from 'next/server';
import { getUserByEmail, createUser } from '../../../../lib/db.js';
import { hashPassword, createSessionToken, setSessionCookie } from '../../../../lib/auth.js';
import { sendWelcomeEmail } from '../../../../lib/welcomeEmail.js';

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'E-mail obrigatório e senha com pelo menos 8 caracteres' },
      { status: 400 }
    );
  }

  if (getUserByEmail(email)) {
    return NextResponse.json({ error: 'Já existe uma conta com esse e-mail' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = createUser(email, passwordHash);

  const token = createSessionToken(user.id);
  await setSessionCookie(token);

  // Não espera o e-mail terminar de enviar — o cadastro já foi concluído
  // com sucesso (conta criada, sessão aberta), então a resposta não deve
  // ficar lenta nem falhar por causa do envio de e-mail. sendWelcomeEmail
  // nunca lança erro, só registra no console se algo der errado.
  sendWelcomeEmail(user);

  return NextResponse.json({
    user: { id: user.id, email: user.email, credits_balance: user.credits_balance },
  });
}
