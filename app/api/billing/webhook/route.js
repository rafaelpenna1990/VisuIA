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
} from '../../../../lib/db.js';
import { PLANS, planTokensToReais, trialBonusReais } from '../../../../lib/plans.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Assinatura inválida: ${err.message}` }, { status: 400 });
  }

  if (wasWebhookEventProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.mode === 'subscription') {
      const userId = Number(session.metadata?.user_id);
      const plan = session.metadata?.plan;
      if (userId && plan && PLANS[plan]) {
        createSubscription(userId, session.subscription, session.customer, plan);
        addCredits(userId, trialBonusReais(), `Bônus de 7 dias grátis — plano ${PLANS[plan].name}`, session.id);
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
      if (sub) {
        if (sub.first_charge_done) {
          const reais = planTokensToReais(sub.plan);
          addCredits(sub.user_id, reais, `Assinatura ${PLANS[sub.plan]?.name || sub.plan} — renovação mensal`, invoice.id);
        } else {
          const remainder = planTokensToReais(sub.plan) - trialBonusReais();
          addCredits(sub.user_id, remainder, `Assinatura ${PLANS[sub.plan]?.name || sub.plan} — fim do período grátis`, invoice.id);
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