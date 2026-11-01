import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '../../../../lib/auth.js';
import { PACKS } from '../../../../lib/packs.js';
import { getBillingProviderForUser } from '../../../../lib/billingProvider.js';
import { createPackLink } from '../../../../lib/pagarmeBilling.js';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  maxNetworkRetries: 2,
  timeout: 20000,
});

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { pack } = await request.json();
  const chosen = PACKS[pack];
  if (!chosen) return NextResponse.json({ error: 'Pacote inválido' }, { status: 400 });

  if (getBillingProviderForUser(user) === 'pagarme') {
    try {
      const url = await createPackLink(user, chosen);
      return NextResponse.json({ checkout_url: url });
    } catch (err) {
      return NextResponse.json({ error: `Falha ao criar pagamento na Pagar.me: ${err.message}` }, { status: 502 });
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 });
  }

  const origin = request.headers.get('origin') || process.env.APP_URL;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'pt-BR',
      payment_method_types: ['card'], // add 'boleto' or 'pix' here once enabled on your Stripe BR account
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: chosen.label },
          unit_amount: chosen.amount_cents,
        },
        quantity: 1,
      }],
      metadata: { user_id: String(user.id), amount_brl: String(chosen.amount_cents / 100) },
      success_url: `${origin}/studio?topup=success`,
      cancel_url: `${origin}/studio?topup=cancelled`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao criar checkout no Stripe: ${err.message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ checkout_url: session.url });
}