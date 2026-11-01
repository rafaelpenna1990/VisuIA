import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  wasWebhookEventProcessed,
  markWebhookEventProcessed,
  updateSubscriptionStatus,
} from '../../../../lib/db.js';
import { pagarmeRequest } from '../../../../lib/pagarme.js';
import { creditPaidCharge, ensureLocalSubscription, userFromCustomer } from '../../../../lib/pagarmeSync.js';
import { sendPaymentFailedEmail } from '../../../../lib/paymentFailedEmail.js';

// Recebe os avisos (webhooks) da Pagar.me. Cadastre a URL
//   https://SEU-SITE/api/billing/pagarme-webhook?token=<PAGARME_WEBHOOK_TOKEN>
// e marque os eventos: subscription.created, subscription.canceled,
// charge.paid, charge.payment_failed.
//
// Segurança: (1) a URL leva um token secreto; (2) o aviso só diz "algo
// aconteceu com a cobrança X" — os dados que valem (valor, cliente, status)
// são sempre buscados de novo na API da Pagar.me com a nossa chave, então um
// aviso falso não consegue creditar nada.

function tokenIsValid(request) {
  const expected = (process.env.PAGARME_WEBHOOK_TOKEN || '').trim();
  const given = new URL(request.url).searchParams.get('token') || '';
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleChargeFailed(chargeId) {
  const charge = await pagarmeRequest('GET', `/charges/${chargeId}`);
  if (!charge.invoice) return; // compra avulsa recusada: o cliente vê na hora
  const user = await userFromCustomer(charge.customer);
  if (user) await sendPaymentFailedEmail(user);
}

export async function POST(request) {
  if (!tokenIsValid(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let event;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }
  if (!event?.id || !event?.type) {
    return NextResponse.json({ error: 'Evento inválido' }, { status: 400 });
  }

  if (wasWebhookEventProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const objectId = event.data?.id;
    switch (event.type) {
      case 'subscription.created':
        if (objectId) await ensureLocalSubscription(objectId);
        break;
      case 'subscription.canceled':
        if (objectId) updateSubscriptionStatus(objectId, 'canceled');
        break;
      case 'charge.paid':
        if (objectId) await creditPaidCharge(objectId);
        break;
      case 'charge.payment_failed':
        if (objectId) await handleChargeFailed(objectId);
        break;
      default:
        break; // eventos que não usamos
    }
  } catch (err) {
    console.error('[pagarme-webhook]', event.type, err.message);
    // 500 faz a Pagar.me tentar de novo mais tarde; tudo aqui é idempotente.
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  markWebhookEventProcessed(event.id);
  return NextResponse.json({ received: true });
}
