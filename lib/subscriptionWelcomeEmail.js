import { Resend } from 'resend';
import { emailHtml } from './emailTemplate.js';
import { getSetting } from './db.js';

// Enviado uma vez quando alguém começa uma assinatura (período grátis),
// seja pela Pagar.me ou pela Stripe. Tem um botão que leva direto para a
// conta da pessoa.
//
// O texto é editável em Admin → Configurações (chaves
// subscription_email_*). No texto dá para usar estes atalhos, que são
// trocados pelos dados reais: {plano} {tokens} {bonus} {dias} {valor} {data}
//
// Nunca lança erro: uma falha de e-mail não pode atrapalhar a assinatura
// nem fazer o aviso do webhook ser reenviado.
const money = (cents) => `R$ ${(Number(cents) / 100).toFixed(2).replace('.', ',')}`;
const num = (n) => Number(n).toLocaleString('pt-BR');

function fill(text, values) {
  return String(text).replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

export async function sendSubscriptionWelcomeEmail(user, plan, { trialDays } = {}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[subscriptionWelcomeEmail] RESEND_API_KEY não configurada — e-mail não enviado.');
    return;
  }
  if (!user?.email || !plan) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.CONTACT_FROM_EMAIL || 'VisuIA <onboarding@resend.dev>';
    const appUrl = process.env.APP_URL || 'https://www.visuia.ai';

    const days = Number(trialDays) > 0 ? Number(trialDays) : 0;
    const chargeDate = new Date(Date.now() + days * 86400000).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
    });
    const values = {
      plano: plan.name,
      tokens: num(plan.tokens),
      bonus: num(Number(getSetting('trial_bonus_tokens', '500'))),
      dias: String(days),
      valor: money(plan.amount_cents),
      data: chargeDate,
    };

    const badge = getSetting('subscription_email_badge', 'Assinatura confirmada');
    const headline = getSetting('subscription_email_headline', 'Bem-vindo(a) ao plano {plano}!');
    const body = getSetting(
      'subscription_email_body',
      'Obrigado por assinar a VisuIA! Seu período grátis de {dias} dias já começou e você já recebeu {bonus} VisuTokens para começar a criar agora.\n' +
      'A primeira cobrança de {valor} será feita em {data}. Nesse dia você recebe os {tokens} VisuTokens do plano, e depois a cobrança é mensal.\n' +
      'Você acompanha seu saldo e pode cancelar quando quiser em Minha Conta.'
    );
    const buttonText = getSetting('subscription_email_button_text', 'Acessar minha conta');

    await resend.emails.send({
      from,
      to: user.email,
      subject: fill(getSetting('subscription_email_subject', 'Sua assinatura VisuIA está ativa 🎉'), values),
      html: emailHtml({
        badge: fill(badge, values),
        headline: fill(headline, values),
        body: fill(body, values),
        buttonText: fill(buttonText, values),
        buttonLink: `${appUrl}/conta`,
      }),
    });
  } catch (err) {
    console.error('[subscriptionWelcomeEmail] falha ao enviar e-mail da assinatura:', err.message);
  }
}
