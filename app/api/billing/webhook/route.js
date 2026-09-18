import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addCredits } from '../../../../lib/db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = Number(session.metadata?.user_id);
    const amountBRL = Number(session.metadata?.amount_brl);
    if (userId && amountBRL) {
      addCredits(userId, amountBRL, 'Recarga via Stripe', session.id);
    }
  }

  return NextResponse.json({ received: true });
}
