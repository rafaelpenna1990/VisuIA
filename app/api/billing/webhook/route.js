import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  addCredits,
  wasWebhookEventProcessed,
  markWebhookEventProcessed,
  createSubscription,
  getSubscriptionByStripeId,
  updateSubscriptionStatus,
  markFirstChargeDone,
  getPlanById,
  getSetting,
} from '../../../../lib/db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function planTokensToReais(plan) {
  return plan.tokens / 100;
}

function trialBonusReais() {
  return Number(getSetting('trial_bonus_tokens', '500')) / 100;
}

// IMPORTANT: never trust a client-side "payment succeeded" callback to
// unlock credits — that can be faked by anyone who opens dev tools. This
// webhook, verified with your signing secret, is the only source of truth
// for "did the money actually arrive".
export async function POST(request) {
  const body = await request.text(); // raw body — required for signature check
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Assinatura inválida: ${err.message}` }, { status: 400 });
  }

  // Stripe redelivers events (network hiccups, slow responses, etc.) — this
  // is what stops a redelivered "invoice.paid" from granting tokens twice,
  // or a redelivered top-up from double-crediting.
  if (wasWebhookEventProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.mode === 'subscription') {
      // Every subscription starts with a 7-day trial (see
      // billing/subscribe/route.js) — record it and immediately credit the
      // flat trial bonus. The REST of the plan's tokens arrive later, via
      // invoice.paid, whenever the trial actually converts to a real charge
      // (day 7, or sooner if the person brings billing forward early).
      const userId = Number(session.metadata?.user_id);
      const planId = session.metadata?.plan;
      const plan = planId ? getPlanById(planId) : null;
      if (userId && plan) {
        createSubscription(userId, session.subscription, session.customer, planId);
        addCredits(userId, trialBonusReais(), `Bônus de 7 dias grátis — plano ${plan.name}`, session.id);
      }
    } else {
      const userId = Number(session.metadata?.user_id);
      const amountBRL = Number(session.metadata?.amount_brl);
      if (userId && amountBRL) {
        addCredits(userId, amountBRL, 'Recarga via Stripe', session.id);
      }
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const stripeSubscriptionId = invoice.subscription;
    if (stripeSubscriptionId) {
      const sub = getSubscriptionByStripeId(stripeSubscriptionId);
      const plan = sub ? getPlanById(sub.plan) : null;
      if (sub && plan) {
        if (sub.first_charge_done) {
          // A normal monthly renewal — full plan amount, same as before
          // the trial system existed.
          const reais = planTokensToReais(plan);
          addCredits(sub.user_id, reais, `Assinatura ${plan.name} — renovação mensal`, invoice.id);
        } else {
          // First real charge (trial just converted to paid, whether that
          // happened naturally on day 7 or was brought forward early).
          // They already got the trial bonus up front, so only the
          // remainder tops them up to the plan's full monthly amount.
          const remainder = planTokensToReais(plan) - trialBonusReais();
          addCredits(sub.user_id, remainder, `Assinatura ${plan.name} — fim do período grátis`, invoice.id);
          markFirstChargeDone(stripeSubscriptionId);
        }
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    updateSubscriptionStatus(subscription.id, 'canceled');
  }

  markWebhookEventProcessed(event.id);
  return NextResponse.json({ received: true });
}
