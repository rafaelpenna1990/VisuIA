// Lógica de sincronização com a Pagar.me usada tanto pelo webhook quanto
// pelas rotas do formulário de pagamento: tudo aqui é idempotente (pode ser
// chamado várias vezes para a mesma cobrança sem creditar em dobro).
import {
  addCredits,
  wasWebhookEventProcessed,
  markWebhookEventProcessed,
  createSubscription,
  getSubscriptionByStripeId,
  markFirstChargeDone,
  getPlanById,
  getUserById,
  getSetting,
} from './db.js';
import { pagarmeRequest } from './pagarme.js';
import { sendSubscriptionWelcomeEmail } from './subscriptionWelcomeEmail.js';
import { describeRemotePlan, userIdFromCustomerCode } from './pagarmeBilling.js';

function trialBonusReais() {
  return Number(getSetting('trial_bonus_tokens', '500')) / 100;
}

export async function userFromCustomer(customerRef) {
  let code = customerRef?.code;
  if (!code && customerRef?.id) {
    const customer = await pagarmeRequest('GET', `/customers/${customerRef.id}`);
    code = customer?.code;
  }
  const userId = userIdFromCustomerCode(code);
  return userId ? getUserById(userId) : null;
}

// Garante que a assinatura da Pagar.me existe no nosso banco (cria e dá o
// bônus do período grátis na primeira vez). Devolve a linha local.
export async function ensureLocalSubscription(pagarmeSubscriptionId) {
  const existing = getSubscriptionByStripeId(pagarmeSubscriptionId);
  if (existing) return existing;

  const sub = await pagarmeRequest('GET', `/subscriptions/${pagarmeSubscriptionId}`);
  const user = await userFromCustomer(sub.customer);
  if (!user) throw new Error(`Assinatura ${pagarmeSubscriptionId} sem cliente VisuIA reconhecido`);

  const parsed = await describeRemotePlan(sub.plan);
  const plan = parsed ? getPlanById(parsed.planId) : null;
  if (!plan) throw new Error(`Plano não reconhecido na assinatura ${pagarmeSubscriptionId}: ${sub.plan?.name}`);

  // Pode ter sido criada por outro aviso enquanto buscávamos os dados.
  const raced = getSubscriptionByStripeId(pagarmeSubscriptionId);
  if (raced) return raced;

  createSubscription(user.id, pagarmeSubscriptionId, sub.customer?.id || '', plan.id, 'pagarme');
  // Só há bônus quando existe período grátis (assinatura criada sem trial, como
  // na antecipação da cobrança, não ganha o bônus de novo).
  if (parsed.trialDays > 0) {
    addCredits(user.id, trialBonusReais(), `Bônus do período grátis — plano ${plan.name}`, `pagarme:sub:${pagarmeSubscriptionId}`);
    // E-mail de boas-vindas (a assinatura criada ao antecipar a cobrança não
    // tem período grátis e não envia de novo).
    await sendSubscriptionWelcomeEmail(user, plan, { trialDays: parsed.trialDays });
  }
  return getSubscriptionByStripeId(pagarmeSubscriptionId);
}

// Descobre a qual assinatura uma cobrança pertence (null = compra avulsa).
async function subscriptionIdOfCharge(charge) {
  const invoice = charge.invoice;
  if (!invoice) return null;
  const direct = invoice.subscription?.id || invoice.subscription_id || invoice.subscriptionId;
  if (direct) return direct;
  if (invoice.id) {
    const full = await pagarmeRequest('GET', `/invoices/${invoice.id}`);
    const found = full?.subscription?.id || full?.subscription_id;
    if (found) return found;
  }
  // Tem fatura, mas não achamos a assinatura: melhor falhar (a Pagar.me
  // tenta de novo) do que tratar uma mensalidade como compra avulsa.
  throw new Error(`Cobrança ${charge.id} tem fatura mas a assinatura não foi encontrada`);
}

// Credita o que uma cobrança paga representa. Devolve true se creditou agora.
export async function creditPaidCharge(chargeId) {
  const dedupeKey = `pagarme:charge:${chargeId}`;
  if (wasWebhookEventProcessed(dedupeKey)) return false;

  const charge = await pagarmeRequest('GET', `/charges/${chargeId}`);
  if (charge.status !== 'paid') return false;
  const paidCents = Number(charge.paid_amount ?? charge.amount ?? 0);
  if (!(paidCents > 0)) return false;

  const user = await userFromCustomer(charge.customer);
  if (!user) throw new Error(`Cobrança ${chargeId} sem cliente VisuIA reconhecido`);

  const subscriptionId = await subscriptionIdOfCharge(charge);
  const sub = subscriptionId ? await ensureLocalSubscription(subscriptionId) : null;
  const plan = sub ? getPlanById(sub.plan) : null;
  if (sub && !plan) throw new Error(`Plano ${sub.plan} não existe mais`);

  // Daqui até o fim não há mais "await": a conferência e o crédito acontecem
  // de uma vez, então o aviso do webhook e a consulta do navegador não
  // conseguem creditar a mesma cobrança duas vezes.
  if (wasWebhookEventProcessed(dedupeKey)) return false;

  if (sub) {
    const fresh = getSubscriptionByStripeId(subscriptionId);
    const description = fresh.first_charge_done
      ? `Assinatura ${plan.name} — renovação mensal`
      : `Assinatura ${plan.name} — fim do período grátis`;
    addCredits(fresh.user_id, plan.tokens / 100, description, dedupeKey);
    if (!fresh.first_charge_done) markFirstChargeDone(subscriptionId);
  } else {
    // Compra avulsa (cartão ou Pix): cada R$ 1 pago vira R$ 1 de saldo.
    addCredits(user.id, paidCents / 100, 'Recarga via Pagar.me', dedupeKey);
  }
  markWebhookEventProcessed(dedupeKey);
  return true;
}
