import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { getUsersBySegment } from '../../../../../lib/db.js';
import { emailHtml } from '../../../../../lib/emailTemplate.js';

const APP_URL = process.env.APP_URL || 'https://www.visuia.ai';

const SEGMENT_LABELS = {
  no_subscription: 'Cadastrados sem assinatura',
  all: 'Todos os usuários',
  active_subscription: 'Com assinatura ativa',
  canceled_subscription: 'Assinatura cancelada',
};



// GET ?segment=X — recipient count + rendered preview for whatever
// subject/badge/headline/body/buttonText/buttonLink was passed, without
// sending anything. POST — the same fields, actually sends.
function parseContentParams(source) {
  return {
    segment: source.get('segment') || 'no_subscription',
    subject: source.get('subject') || '',
    badge: source.get('badge') || '',
    headline: source.get('headline') || '',
    body: source.get('body') || '',
    buttonText: source.get('buttonText') || '',
    buttonLink: source.get('buttonLink') || '',
  };
}

export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const params = parseContentParams(request.nextUrl.searchParams);
  const recipients = getUsersBySegment(params.segment);
  return NextResponse.json({
    count: recipients.length,
    segments: Object.entries(SEGMENT_LABELS).map(([id, label]) => ({ id, label })),
    previewHtml: emailHtml(params),
  });
}

export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Envio de e-mail não configurado no servidor (RESEND_API_KEY)' }, { status: 500 });
  }

  const body = await request.json();
  const { segment, subject, badge, headline, body: bodyText, buttonText, buttonLink } = body;

  if (!subject?.trim() || !headline?.trim()) {
    return NextResponse.json({ error: 'Preencha pelo menos o assunto e o título' }, { status: 400 });
  }

  const recipients = getUsersBySegment(segment || 'no_subscription');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = emailHtml({ badge, headline, body: bodyText, buttonText, buttonLink });
  const from = process.env.CONTACT_FROM_EMAIL || 'VisuIA <onboarding@resend.dev>';

  let sent = 0;
  const failed = [];

  for (const user of recipients) {
    try {
      await resend.emails.send({ from, to: user.email, subject, html });
      sent++;
    } catch (err) {
      failed.push({ email: user.email, error: err.message });
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return NextResponse.json({ ok: true, total: recipients.length, sent, failed });
}
