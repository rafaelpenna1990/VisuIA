import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSetting } from '../../../lib/db.js';

// The floating support bubble (every page) posts here. Sends the message
// to whatever email is set in /admin → Configurações, via Resend.
export async function POST(request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Envio de e-mail não configurado no servidor' }, { status: 500 });
  }

  const supportEmail = getSetting('support_email', '');
  if (!supportEmail) {
    return NextResponse.json({ error: 'E-mail de destino não configurado no admin' }, { status: 500 });
  }

  const { name, email, message } = await request.json();
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Preencha nome, e-mail e mensagem' }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Mensagem muito longa' }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || 'VisuIA <onboarding@resend.dev>',
      to: supportEmail,
      replyTo: email,
      subject: `Nova mensagem de suporte — ${name}`,
      text: `De: ${name} (${email})\n\n${message}`,
    });
  } catch (err) {
    return NextResponse.json({ error: `Falha ao enviar: ${err.message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
