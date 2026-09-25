import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { getUserById } from '../../../../../lib/db.js';
import { emailHtml } from '../../../../../lib/emailTemplate.js';

// Sends a one-off branded email to a single user — same template and
// editable fields as the Marketing tab's bulk campaigns, just aimed at
// one person instead of a whole segment. Powers the "E-mail" tab inside
// a user's detail panel in the admin Usuários tab.
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Envio de e-mail não configurado no servidor (RESEND_API_KEY)' }, { status: 500 });
  }

  const { userId, subject, badge, headline, body, buttonText, buttonLink } = await request.json();
  if (!userId || !subject?.trim() || !headline?.trim()) {
    return NextResponse.json({ error: 'Preencha pelo menos o assunto e o título' }, { status: 400 });
  }

  const user = getUserById(Number(userId));
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.CONTACT_FROM_EMAIL || 'VisuIA <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from,
      to: user.email,
      subject,
      html: emailHtml({ badge, headline, body, buttonText, buttonLink }),
    });
  } catch (err) {
    return NextResponse.json({ error: `Falha ao enviar: ${err.message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
