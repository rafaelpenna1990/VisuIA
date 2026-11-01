import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '../../../../lib/auth.js';
import { getActiveSubscriptionForUser, updateSubscriptionStatus } from '../../../../lib/db.js';
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

  if (sub.provider === 'pagarme') {
    // A Pagar.me cancela na hora; os VisuTokens já creditados continuam no saldo.
    try {
      await pagarmeRequest('DELETE', `/subscriptions/${sub.stripe_subscription_id}`, { cancel_pending_invoices: true });
    } catch (err) {
      return NextResponse.json({ error: `Falha ao cancelar: ${err.message}` }, { status: 502 });
    }
    updateSubscriptionStatus(sub.stripe_subscription_id, 'canceled');
    return NextResponse.json({ ok: true });
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
  } catch (err) {
    return NextResponse.json({ error: `Falha ao cancelar: ${err.message}` }, { status: 502 });
  }

  updateSubscriptionStatus(sub.stripe_subscription_id, 'canceling');
  return NextResponse.json({ ok: true });
}