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

// Stripe removed the top-level invoice.subscription field (API version
// 2025-03-31.basil onward) in favor of invoice.parent.subscription_details
// .subscription — and webhook payloads render at the Stripe ACCOUNT's
// current API version, not whatever version this codebase pins, so this
// can start returning undefined with no deploy on our end at all. Reading
// both shapes means it keeps working whichever one Stripe actually sends.
function getInvoiceSubscriptionId(invoice) {
  return invoice.subscription || invoice.parent?.subscription_details?.subscription || null;
}

// OpenAI/ChatGPT Ads server-side conversion — fired right when a
// subscription is confirmed via Stripe's webhook (the reliable source of
// truth), not on a client-side button click. Never throws: a failure here
// must never break the actual subscription/credit logic above it.
async function sendOaiqConversion(eventId, eventCreatedUnix, sourceUrl) {
  const apiKey = process.env.OAIQ_CONVERSIONS_API_KEY;
  if (!apiKey) return; // not configured yet — silently skip
  try {
    await fetch('https://bzr.openai.com/v1/events?pid=BLB53QxR2uFvCfCJDUeRB2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        validate_only: false,
        events: [
          {
            id: eventId,
            type: 'subscription_created',
            timestamp_ms: eventCreatedUnix * 1000,
            source_url: sourceUrl,
            action_source: 'web',
            data: { type: 'plan_enrollment' },
          },
        ],
      }),
    });
  } catch {
    // Ads tracking failing is not a reason to fail the webhook — Stripe
    // would just retry it, double-crediting the user.
  }
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
        await sendOaiqConversion(session.id, event.created, `${process.env.APP_URL || 'https://www.visuia.ai'}/conta?tab=assinatura`);
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
    const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);
    // Stripe fires invoice.paid for the R$0 invoice it creates the moment
    // a trial subscription starts, not just for real charges — without
    // this check, that R$0 event was being read as "the trial just ended,
    // release the rest of the tokens" immediately at signup.
    const isRealCharge = (invoice.amount_paid || 0) > 0;

    if (stripeSubscriptionId && isRealCharge) {
      const sub = getSubscriptionByStripeId(stripeSubscriptionId);
      const plan = sub ? getPlanById(sub.plan) : null;
      if (sub && plan) {
        // The trial bonus (given free at signup) and the plan's monthly
        // tokens (given when they actually convert to paying) stack —
        // the trial bonus is a separate welcome gift, not an advance on
        // the plan itself. Same full amount whether this is the first
        // real charge or a later monthly renewal.
        const reais = planTokensToReais(plan);
        const description = sub.first_charge_done
          ? `Assinatura ${plan.name} — renovação mensal`
          : `Assinatura ${plan.name} — fim do período grátis`;
        addCredits(sub.user_id, reais, description, invoice.id);
        if (!sub.first_charge_done) markFirstChargeDone(stripeSubscriptionId);
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
