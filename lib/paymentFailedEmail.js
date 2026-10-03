import { Resend } from 'resend';
import { emailHtml } from './emailTemplate.js';
import { getSetting } from './db.js';

// Fires from the billing webhook whenever a subscription charge is
// declined by the card issuer — the trial-to-paid conversion on day 7, or
// a later monthly renewal. Common in Brazil: the issuing bank blocks an
// unfamiliar recurring charge by default, and the person often has no
// idea anything failed until the service just stops working.
//
// Copy is editable in Admin → Configurações (chaves payment_failed_email_*),
// same pattern as o e-mail de boas-vindas, com um valor padrão aqui caso a
// configuração ainda não tenha sido salva no banco.
//
// On purpose this NEVER throws: a webhook failure here must not make
// Stripe think the event delivery failed (which would just get it
// redelivered and double-processed).
export async function sendPaymentFailedEmail(user) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[paymentFailedEmail] RESEND_API_KEY não configurada — e-mail de cobrança recusada não enviado.');
    return;
  }
  if (!user?.email) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.CONTACT_FROM_EMAIL || 'VisuIA <onboarding@resend.dev>';
    const appUrl = process.env.APP_URL || 'https://www.visuia.ai';

    const badge = getSetting('payment_failed_email_badge', 'Pagamento não aprovado');
    const headline = getSetting('payment_failed_email_headline', 'Não conseguimos cobrar seu cartão');
    const body = getSetting(
      'payment_failed_email_body',
      'A cobrança da sua assinatura VisuIA não foi aprovada pelo seu banco.\n' +
      'Isso costuma acontecer quando o banco bloqueia por segurança uma cobrança recorrente de um lojista novo — ' +
      'normalmente basta atualizar o cartão ou confirmar o pagamento para resolver.\n' +
      'Vamos tentar novamente automaticamente nos próximos dias, mas você pode resolver agora mesmo clicando no botão abaixo.'
    );
    const buttonText = getSetting('payment_failed_email_button_text', 'Atualizar forma de pagamento');

    await resend.emails.send({
      from,
      to: user.email,
      subject: 'Não conseguimos cobrar sua assinatura VisuIA',
      html: emailHtml({
        badge,
        headline,
        body,
        buttonText,
        buttonLink: `${appUrl}/conta?tab=assinatura`,
      }),
    });
  } catch (err) {
    // Nunca deixa isso quebrar o processamento do webhook — só registra
    // pra investigar depois.
    console.error('[paymentFailedEmail] falha ao enviar e-mail de cobrança recusada:', err.message);
  }
}
