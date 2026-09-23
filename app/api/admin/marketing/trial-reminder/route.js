import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { getUsersWithoutActiveSubscription, getSetting } from '../../../../../lib/db.js';

const APP_URL = process.env.APP_URL || 'https://www.visuia.ai';

function emailHtml() {
  const trialBonusTokens = Number(getSetting('trial_bonus_tokens', '500'));
  return `
  <div style="background:#080910;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#0F1119;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
      <div style="padding:32px 32px 0 32px;text-align:center;">
        <img src="${APP_URL}/api/assets/logo.png" alt="VisuIA" style="height:56px;width:auto;margin-bottom:24px;" />
      </div>
      <div style="padding:0 32px 32px 32px;">
        <span style="display:inline-block;background:#FF9500;color:#000;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;padding:6px 14px;border-radius:999px;margin-bottom:16px;">
          Oferta de boas-vindas
        </span>
        <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 12px 0;line-height:1.3;">
          Seus ${trialBonusTokens.toLocaleString('pt-BR')} VisuTokens grátis ainda estão esperando
        </h1>
        <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 24px 0;">
          Você criou sua conta no VisuIA, mas ainda não assinou nenhum plano. Que tal experimentar de verdade?
          Comece agora com <strong style="color:#FF9500;">7 dias grátis</strong> — os ${trialBonusTokens.toLocaleString('pt-BR')}
          VisuTokens caem na sua conta na hora, sem cobrar nada do cartão até o 7º dia.
        </p>
        <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 28px 0;">
          Crie imagens, vídeos, sincronia labial e efeitos de cinema com inteligência artificial —
          suporte 100% em português, sem enrolação.
        </p>
        <div style="text-align:center;">
          <a href="${APP_URL}/conta?tab=assinatura"
             style="display:inline-block;background:#FF9500;color:#000;font-weight:800;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:14px;">
            Começar meus 7 dias grátis
          </a>
        </div>
      </div>
      <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">VisuIA — Feito no Brasil</p>
      </div>
    </div>
  </div>`;
}

// Sends the "come subscribe" re-engagement email to every signed-up user
// who never started a subscription. GET (no ?confirm=1) just returns the
// recipient count and an HTML preview, so the admin panel can show it
// before actually sending anything.
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const recipients = getUsersWithoutActiveSubscription();
  return NextResponse.json({ count: recipients.length, previewHtml: emailHtml() });
}

export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Envio de e-mail não configurado no servidor (RESEND_API_KEY)' }, { status: 500 });
  }

  const recipients = getUsersWithoutActiveSubscription();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = emailHtml();
  const from = process.env.CONTACT_FROM_EMAIL || 'VisuIA <onboarding@resend.dev>';

  let sent = 0;
  const failed = [];

  // Sent one at a time with a small delay — safer than firing all at once
  // against Resend's rate limits, and gives a real count of what actually
  // went out instead of assuming success.
  for (const user of recipients) {
    try {
      await resend.emails.send({
        from,
        to: user.email,
        subject: '🎁 Seus VisuTokens grátis ainda estão esperando',
        html,
      });
      sent++;
    } catch (err) {
      failed.push({ email: user.email, error: err.message });
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return NextResponse.json({ ok: true, total: recipients.length, sent, failed });
}
