import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '../../../../lib/auth.js';
import { PLANS } from '../../../../lib/plans.js';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  maxNetworkRetries: 2,
  timeout: 20000,
});

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 });
  }

  const { plan } = await request.json();
  const chosen = PLANS[plan];
  if (!chosen) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });

  const origin = request.headers.get('origin') || process.env.APP_URL;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: `VisuIA — Plano ${chosen.name}` },
          unit_amount: chosen.amount_cents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
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