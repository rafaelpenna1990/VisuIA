import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUserByEmail, createPasswordResetToken } from '../../../../lib/db.js';
import { emailHtml } from '../../../../lib/emailTemplate.js';

// Sempre responde com a mesma mensagem genérica, exista ou não uma conta
// com esse e-mail — assim ninguém consegue usar esse formulário pra
// descobrir quais e-mails têm cadastro no VisuIA.
const GENERIC_RESPONSE = {
  ok: true,
  message: 'Se esse e-mail tiver uma conta na VisuIA, você vai receber um link em instantes.',
};

export async function POST(request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: 'Informe seu e-mail' }, { status: 400 });
  }

  const user = getUserByEmail(email);

  // Só manda de verdade se a conta existir E tiver senha própria — uma
  // conta só-Google (password_hash vazio) não tem senha pra redefinir
  // por aqui. Em ambos os casos "silenciosos", a resposta pro cliente
  // continua igual.
  if (user && user.password_hash) {
    const token = createPasswordResetToken(user.id);
    const appUrl = process.env.APP_URL || 'https://www.visuia.ai';
    const resetLink = `${appUrl}/redefinir-senha?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const from = process.env.CONTACT_FROM_EMAIL || 'VisuIA <onboarding@resend.dev>';
        await resend.emails.send({
          from,
          to: user.email,
          subject: 'Redefinir sua senha — VisuIA',
          html: emailHtml({
            badge: 'Redefinição de senha',
            headline: 'Alguém pediu pra redefinir sua senha',
            body:
              'Se foi você, clique no botão abaixo pra escolher uma senha nova. Esse link expira em 1 hora.\n' +
              'Se não foi você, pode ignorar este e-mail — sua senha continua a mesma.',
            buttonText: 'Redefinir senha',
            buttonLink: resetLink,
          }),
        });
      } catch (err) {
        console.error('[forgot-password] falha ao enviar e-mail:', err.message);
      }
    }
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
