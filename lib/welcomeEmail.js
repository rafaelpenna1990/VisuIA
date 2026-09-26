import { Resend } from 'resend';
import { emailHtml } from './emailTemplate.js';
import { getSetting } from './db.js';

// Fires once, right after a brand-new account is created — regardless of
// how they signed up (e-mail/senha ou Google). Uses the same branded
// template as the Marketing tab and the individual admin emails.
//
// Badge/título/corpo/botão são editáveis em Admin → Configurações (chaves
// welcome_email_*), com um valor padrão de fallback aqui caso a
// configuração ainda não tenha sido salva no banco.
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

    const badge = getSetting('welcome_email_badge', 'Cadastro confirmado');
    const headline = getSetting('welcome_email_headline', 'Sua conta na VisuIA está pronta!');
    const body = getSetting(
      'welcome_email_body',
      'Que bom ter você aqui! Sua conta já está ativa e você já pode começar a criar imagens, vídeos, lipsync e cenas de cinema com IA.\n' +
      'Dá uma olhada no seu saldo de VisuTokens em "Minha Conta" e explore os estúdios disponíveis.\n' +
      'Qualquer dúvida, é só responder este e-mail que a gente te ajuda.'
    );
    const buttonText = getSetting('welcome_email_button_text', 'Começar a criar');

    await resend.emails.send({
      from,
      to: user.email,
      subject: 'Bem-vindo(a) à VisuIA 🎉',
      html: emailHtml({ badge, headline, body, buttonText, buttonLink: appUrl }),
    });
  } catch (err) {
    // Nunca deixa isso quebrar o cadastro — só registra pra investigar depois.
    console.error('[welcomeEmail] falha ao enviar e-mail de boas-vindas:', err.message);
  }
}
