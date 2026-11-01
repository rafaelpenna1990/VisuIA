import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '../../../../lib/auth.js';
import { getPlanById, getSetting } from '../../../../lib/db.js';
import { getBillingProviderForUser } from '../../../../lib/billingProvider.js';
import { createSubscriptionLink } from '../../../../lib/pagarmeBilling.js';
import { pagarmeFormEnabled, getPagarmePublicKey } from '../../../../lib/pagarmeForm.js';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  maxNetworkRetries: 2,
  timeout: 20000,
});

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { plan } = await request.json();
  const chosen = getPlanById(plan);
  if (!chosen) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });

  const entryFeeCents = Number(getSetting('trial_entry_fee_cents', '0')) || 0;
  const trialDays = Number(getSetting('trial_days', '7')) || 7;

  if (getBillingProviderForUser(user) === 'pagarme') {
    if (pagarmeFormEnabled()) {
      // O navegador abre o formulário de cartão do próprio VisuIA.
      return NextResponse.json({
        pagarme_form: {
          kind: 'subscription',
          publicKey: getPagarmePublicKey(),
          plan: { id: chosen.id, name: chosen.name, amount_cents: chosen.amount_cents },
          trialDays,
        },
      });
    }
    try {
      const url = await createSubscriptionLink(user, chosen, { trialDays, entryFeeCents });
      return NextResponse.json({ checkout_url: url });
    } catch (err) {
      return NextResponse.json({ error: `Falha ao criar assinatura na Pagar.me: ${err.message}` }, { status: 502 });
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 });
  }

  const origin = request.headers.get('origin') || process.env.APP_URL;

  const lineItems = [{
    price_data: {
      currency: 'brl',
      product_data: { name: `VisuIA — Plano ${chosen.name}` },
      unit_amount: chosen.amount_cents,
      recurring: { interval: 'month' },
    },
    quantity: 1,
  }];

  // Optional one-time entry fee, charged immediately alongside starting
  // the trial — separate from the recurring subscription price above,
  // which still only charges for real after trialDays (trial_period_days,
  // editable in /admin).
  if (entryFeeCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'brl',
        product_data: { name: 'Taxa de acesso ao teste grátis' },
        unit_amount: entryFeeCents,
      },
      quantity: 1,
    });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      locale: 'pt-BR',
      payment_method_types: ['card'],
      line_items: lineItems,
      subscription_data: {
        trial_period_days: trialDays,
      },
      metadata: { user_id: String(user.id), plan },
      success_url: `${origin}/conta?tab=assinatura&sub=success`,
      cancel_url: `${origin}/conta?tab=assinatura&sub=cancelled`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao criar assinatura no Stripe: ${err.message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ checkout_url: session.url });
}
