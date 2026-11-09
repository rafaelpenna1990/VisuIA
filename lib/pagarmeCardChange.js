// Troca de cartão de uma assinatura da Pagar.me (Stone).
//
// Dois cenários:
//  1) Sem cobrança pendente (período grátis ou tudo em dia): só troca o cartão
//     da assinatura — vale para as próximas cobranças, nada é cobrado agora.
//  2) Cobrança recusada: cria uma assinatura nova do mesmo plano, sem período
//     grátis, que cobra agora no cartão novo; se aprovar, cancela a antiga
//     (com as faturas pendentes) e credita os tokens. É o mesmo caminho já
//     usado em "Antecipar cobrança".
import { pagarmeRequest } from './pagarme.js';
import { createCardSubscription, describeRemotePlan } from './pagarmeBilling.js';
import { ensureLocalSubscription, creditPaidCharge } from './pagarmeSync.js';
import { getPlanById, updateSubscriptionStatus } from './db.js';

// Olha a assinatura na Pagar.me e devolve o que a tela precisa:
// { card: {brand, last_four}|null, paymentFailed, customerId, planId }
export async function inspectPagarmeSubscription(localSub) {
  const remote = await pagarmeRequest('GET', `/subscriptions/${localSub.stripe_subscription_id}`);

  let paymentFailed = remote.status === 'failed';
  try {
    const invoices = await pagarmeRequest('GET', `/invoices?subscription_id=${remote.id}&size=10`);
    for (const inv of invoices?.data || []) {
      if (inv.status === 'paid' || inv.status === 'canceled') continue;
      if (inv.status === 'failed' || inv.charge?.status === 'failed') paymentFailed = true;
    }
  } catch {
    /* sem a lista de faturas, só não marcamos como recusada */
  }

  let parsed = null;
  try { parsed = await describeRemotePlan(remote.plan); } catch { /* usa o plano local */ }
  return {
    remote,
    card: remote.card ? { brand: remote.card.brand || null, last_four: remote.card.last_four_digits || null } : null,
    paymentFailed,
    customerId: remote.customer?.id || localSub.stripe_customer_id || null,
    planId: parsed?.planId || localSub.plan,
  };
}

// Troca o cartão. Devolve { mode: 'updated' } ou { mode: 'charged' }.
// Lança Error com `.userMessage` quando o cartão novo for recusado.
export async function changeSubscriptionCard(user, localSub, cardId) {
  const info = await inspectPagarmeSubscription(localSub);
  const oldId = localSub.stripe_subscription_id;

  if (!info.paymentFailed) {
    await pagarmeRequest('PATCH', `/subscriptions/${oldId}/card`, { card_id: cardId });
    return { mode: 'updated' };
  }

  const plan = getPlanById(info.planId);
  if (!plan) throw new Error('Plano da assinatura não encontrado');
  if (!info.customerId) throw new Error('Cliente da assinatura não encontrado');

  const created = await createCardSubscription(user, plan, { trialDays: 0, customerId: info.customerId, cardId });
  if (!created?.id || ['canceled', 'failed'].includes(created.status)) {
    // Se a Pagar.me chegou a criar a assinatura recusada, não deixa lixo cobrando.
    if (created?.id) {
      try { await pagarmeRequest('DELETE', `/subscriptions/${created.id}`, { cancel_pending_invoices: true }); } catch { /* ignora */ }
    }
    const err = new Error('card_declined');
    err.userMessage = 'O novo cartão também foi recusado. Confira os dados ou use outro cartão.';
    throw err;
  }

  try {
    await pagarmeRequest('DELETE', `/subscriptions/${oldId}`, { cancel_pending_invoices: true });
    updateSubscriptionStatus(oldId, 'canceled');
  } catch (err) {
    if (err.status === 404) {
      updateSubscriptionStatus(oldId, 'canceled');
    } else {
      const e = new Error(`A cobrança foi feita, mas não consegui cancelar a assinatura antiga (${err.message}). Fale com o suporte para não ser cobrado em dobro.`);
      e.userMessage = e.message;
      throw e;
    }
  }

  // Registra a assinatura nova e credita agora; se algo falhar, o webhook completa.
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
  return { mode: 'charged' };
}
