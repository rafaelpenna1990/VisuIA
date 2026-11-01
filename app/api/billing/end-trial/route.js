import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '../../../../lib/auth.js';
import { getActiveSubscriptionForUser, getPlanById, updateSubscriptionStatus } from '../../../../lib/db.js';
import { pagarmeRequest } from '../../../../lib/pagarme.js';
import { createCardSubscription, parsePagarmePlanName } from '../../../../lib/pagarmeBilling.js';
import { ensureLocalSubscription, creditPaidCharge } from '../../../../lib/pagarmeSync.js';

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
    // A Pagar.me não deixa antecipar a data de início (só "a partir de amanhã").
    // Então criamos uma assinatura nova do mesmo plano, sem período grátis, que
    // cobra na hora com o cartão já salvo, e cancelamos a antiga.
    const oldId = sub.stripe_subscription_id;
    let created;
    try {
      const old = await pagarmeRequest('GET', `/subscriptions/${oldId}`);
      const parsed = parsePagarmePlanName(old.plan?.name);
      const plan = getPlanById(parsed?.planId || sub.plan);
      if (!plan) throw new Error('Plano da assinatura não encontrado');
      if (!old.card?.id || !old.customer?.id) throw new Error('Cartão da assinatura não encontrado');

      created = await createCardSubscription(user, plan, { trialDays: 0, customerId: old.customer.id, cardId: old.card.id });
      if (!created?.id || ['canceled', 'failed'].includes(created.status)) {
        throw new Error('O cartão foi recusado na cobrança');
      }
    } catch (err) {
      return NextResponse.json({ error: `Falha ao antecipar a cobrança: ${err.message}` }, { status: 502 });
    }

    try {
      await pagarmeRequest('DELETE', `/subscriptions/${oldId}`, { cancel_pending_invoices: true });
      updateSubscriptionStatus(oldId, 'canceled');
    } catch (err) {
      return NextResponse.json({
        error: `A cobrança foi feita, mas não consegui cancelar a assinatura antiga (${err.message}). Fale com o suporte para não ser cobrado em dobro.`,
      }, { status: 502 });
    }

    // Registra a nova assinatura e credita os tokens agora; se algo falhar aqui,
    // o aviso (webhook) da Pagar.me faz o mesmo em seguida.
    try {
      await ensureLocalSubscription(created.id);
      const invoices = await pagarmeRequest('GET', `/invoices?subscription_id=${created.id}&size=5`);
      for (const inv of invoices?.data || []) {
        const chargeId = inv.charge?.id;
        if (chargeId && inv.charge?.status === 'paid') await creditPaidCharge(chargeId);
      }
    } catch {
      /* o webhook completa */
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