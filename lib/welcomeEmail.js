import { Resend } from 'resend';
import { emailHtml } from './emailTemplate.js';

// Fires once, right after a brand-new account is created — regardless of
// how they signed up (e-mail/senha, Google ou Facebook). Uses the same
// branded template as the Marketing tab and the individual admin emails.
//
// On purpose this NEVER throws: a signup that already succeeded (the
// user row is created, the session cookie is set) should never fail or
// even feel slow just because Resend hiccupped. Any problem here is
// only logged to the server console, not surfaced to the person signing
// up.
export async function sendWelcomeEmail(user) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[welcomeEmail] RESEND_API_KEY não configurada — e-mail de boas-vindas não enviado.');
    return;
  }
  if (!user?.email) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.CONTACT_FROM_EMAIL || 'VisuIA <onboarding@resend.dev>';
    const appUrl = process.env.APP_URL || 'https://www.visuia.ai';

    await resend.emails.send({
      from,
      to: user.email,
      subject: 'Bem-vindo(a) à VisuIA 🎉',
      html: emailHtml({
        badge: 'Cadastro confirmado',
        headline: 'Sua conta na VisuIA está pronta!',
        body:
          'Que bom ter você aqui! Sua conta já está ativa e você já pode começar a criar imagens, vídeos, lipsync e cenas de cinema com IA.\n' +
          'Dá uma olhada no seu saldo de VisuTokens em "Minha Conta" e explore os estúdios disponíveis.\n' +
          'Qualquer dúvida, é só responder este e-mail que a gente te ajuda.',
        buttonText: 'Começar a criar',
        buttonLink: appUrl,
      }),
    });
  } catch (err) {
    // Nunca deixa isso quebrar o cadastro — só registra pra investigar depois.
    console.error('[welcomeEmail] falha ao enviar e-mail de boas-vindas:', err.message);
  }
}
