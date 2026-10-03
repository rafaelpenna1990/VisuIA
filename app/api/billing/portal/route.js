import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '../../../../lib/auth.js';
import { getActiveSubscriptionForUser } from '../../../../lib/db.js';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  maxNetworkRetries: 2,
  timeout: 20000,
});

// Opens a Stripe-hosted "Customer Portal" session — lets the person update
// their card (or see/cancel the subscription) without us building any of
// that UI ourselves. Used by the "Atualizar forma de pagamento" button
// that shows up on /conta when a charge was declined (status past_due).
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const sub = getActiveSubscriptionForUser(user.id);
  if (!sub) return NextResponse.json({ error: 'Nenhuma assinatura encontrada' }, { status: 404 });

  const origin = request.headers.get('origin') || process.env.APP_URL;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/conta?tab=assinatura`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao abrir portal de pagamento: ${err.message}` },
      { status: 502 }
    );
  }
}
