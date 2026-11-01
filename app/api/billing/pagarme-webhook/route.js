import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  addCredits,
  wasWebhookEventProcessed,
  markWebhookEventProcessed,
  createSubscription,
  getSubscriptionByStripeId,
  updateSubscriptionStatus,
  markFirstChargeDone,
  getPlanById,
  getUserById,
  getSetting,
} from '../../../../lib/db.js';
import { pagarmeRequest } from '../../../../lib/pagarme.js';
import { parsePagarmePlanName, userIdFromCustomerCode } from '../../../../lib/pagarmeBilling.js';
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

function trialBonusReais() {
  return Number(getSetting('trial_bonus_tokens', '500')) / 100;
}

async function userFromCustomer(customerRef) {
  let code = customerRef?.code;
  if (!code && customerRef?.id) {
    const customer = await pagarmeRequest('GET', `/customers/${customerRef.id}`);
    code = customer?.code;
  }
  const userId = userIdFromCustomerCode(code);
  return userId ? getUserById(userId) : null;
}

// Garante que a assinatura da Pagar.me existe no nosso banco (cria e dá o
// bônus do período grátis na primeira vez). Devolve a linha local.
async function ensureLocalSubscription(pagarmeSubscriptionId) {
  const existing = getSubscriptionByStripeId(pagarmeSubscriptionId);
  if (existing) return existing;

  const sub = await pagarmeRequest('GET', `/subscriptions/${pagarmeSubscriptionId}`);
  const user = await userFromCustomer(sub.customer);
  if (!user) throw new Error(`Assinatura ${pagarmeSubscriptionId} sem cliente VisuIA reconhecido`);

  let planName = sub.plan?.name;
  if (!planName && sub.plan?.id) {
    planName = (await pagarmeRequest('GET', `/plans/${sub.plan.id}`))?.name;
  }
  const parsed = parsePagarmePlanName(planName);
  const plan = parsed ? getPlanById(parsed.planId) : null;
  if (!plan) throw new Error(`Plano não reconhecido na assinatura ${pagarmeSubscriptionId}: ${planName}`);

  // Pode ter sido criada por outro aviso enquanto buscávamos os dados.
  const raced = getSubscriptionByStripeId(pagarmeSubscriptionId);
  if (raced) return raced;

  createSubscription(user.id, pagarmeSubscriptionId, sub.customer?.id || '', plan.id, 'pagarme');
  addCredits(user.id, trialBonusReais(), `Bônus do período grátis — plano ${plan.name}`, `pagarme:sub:${pagarmeSubscriptionId}`);
  return getSubscriptionByStripeId(pagarmeSubscriptionId);
}

// Descobre a qual assinatura uma cobrança pertence (null = compra avulsa).
async function subscriptionIdOfCharge(charge) {
  const invoice = charge.invoice;
  if (!invoice) return null;
  const direct = invoice.subscription?.id || invoice.subscription_id || invoice.subscriptionId;
  if (direct) return direct;
  if (invoice.id) {
    const full = await pagarmeRequest('GET', `/invoices/${invoice.id}`);
    const found = full?.subscription?.id || full?.subscription_id;
    if (found) return found;
  }
  // Tem fatura, mas não achamos a assinatura: melhor falhar (a Pagar.me
  // tenta de novo) do que tratar uma mensalidade como compra avulsa.
  throw new Error(`Cobrança ${charge.id} tem fatura mas a assinatura não foi encontrada`);
}

async function handleChargePaid(chargeId) {
  const dedupeKey = `pagarme:charge:${chargeId}`;
  if (wasWebhookEventProcessed(dedupeKey)) return;

  const charge = await pagarmeRequest('GET', `/charges/${chargeId}`);
  if (charge.status !== 'paid') return;
  const paidCents = Number(charge.paid_amount ?? charge.amount ?? 0);
  if (!(paidCents > 0)) return;

  const user = await userFromCustomer(charge.customer);
  if (!user) throw new Error(`Cobrança ${chargeId} sem cliente VisuIA reconhecido`);

  const subscriptionId = await subscriptionIdOfCharge(charge);

  if (subscriptionId) {
    const sub = await ensureLocalSubscription(subscriptionId);
    const plan = getPlanById(sub.plan);
    if (!plan) throw new Error(`Plano ${sub.plan} não existe mais`);
    const description = sub.first_charge_done
      ? `Assinatura ${plan.name} — renovação mensal`
      : `Assinatura ${plan.name} — fim do período grátis`;
    addCredits(sub.user_id, plan.tokens / 100, description, dedupeKey);
    if (!sub.first_charge_done) markFirstChargeDone(subscriptionId);
  } else {
    // Compra avulsa (cartão ou Pix): cada R$ 1 pago vira R$ 1 de saldo.
    addCredits(user.id, paidCents / 100, 'Recarga via Pagar.me', dedupeKey);
  }

  markWebhookEventProcessed(dedupeKey);
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
        if (objectId) await handleChargePaid(objectId);
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
