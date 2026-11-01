import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '../../../../lib/auth.js';
import { getActiveSubscriptionForUser } from '../../../../lib/db.js';
import { pagarmeRequest } from '../../../../lib/pagarme.js';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  maxNetworkRetries: 2,
  timeout: 20000,
});

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const sub = getActiveSubscriptionForUser(user.id);
  if (!sub) return NextResponse.json({ error: 'Nenhuma assinatura ativa' }, { status: 404 });
  if (sub.status !== 'trialing') {
    return NextResponse.json({ error: 'Essa assinatura não está mais no período grátis' }, { status: 400 });
  }

  if (sub.provider === 'pagarme') {
    // Adianta o início da assinatura (e, com ele, a primeira cobrança).
    try {
      await pagarmeRequest('PATCH', `/subscriptions/${sub.stripe_subscription_id}/start-at`, {
        start_at: new Date(Date.now() + 60 * 1000).toISOString(),
      });
    } catch (err) {
      return NextResponse.json({ error: `Falha ao antecipar a cobrança: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, { trial_end: 'now' });
  } catch (err) {
    return NextResponse.json({ error: `Falha ao antecipar a cobrança: ${err.message}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}