// Regras de negócio da cobrança via Pagar.me: planos, clientes e links de
// pagamento. Os links de pagamento são páginas hospedadas pela Pagar.me
// (cartão e Pix) — nenhum dado de cartão passa pelo nosso servidor.
import { pagarmeRequest } from './pagarme.js';

// O nome do plano na Pagar.me carrega o nosso id/valor/dias de teste, para o
// webhook saber qual plano é e para reaproveitarmos o plano já criado.
export function pagarmePlanName(plan, trialDays) {
  return `VisuIA|${plan.id}|${plan.amount_cents}|${trialDays}`;
}

export function parsePagarmePlanName(name) {
  const parts = String(name || '').split('|');
  if (parts[0] !== 'VisuIA' || parts.length < 4) return null;
  return { planId: parts[1], amountCents: Number(parts[2]), trialDays: Number(parts[3]) };
}

// O cliente na Pagar.me tem o código "visuia-<id do usuário>"; é assim que o
// webhook descobre de quem é cada pagamento.
export function customerCodeForUser(userId) {
  return `visuia-${userId}`;
}

export function userIdFromCustomerCode(code) {
  const match = /^visuia-(\d+)$/.exec(String(code || ''));
  return match ? Number(match[1]) : null;
}

export async function ensureCustomer(user) {
  const code = customerCodeForUser(user.id);
  const list = await pagarmeRequest('GET', `/customers?code=${encodeURIComponent(code)}`);
  const found = (list?.data || []).find((c) => c.code === code);
  if (found) return found;

  const name = String(user.name || String(user.email || '').split('@')[0] || 'Cliente VisuIA').slice(0, 64);
  return pagarmeRequest('POST', '/customers', {
    name,
    email: user.email,
    code,
    type: 'individual',
    metadata: { user_id: String(user.id) },
  });
}

export async function ensurePlan(plan, trialDays) {
  const name = pagarmePlanName(plan, trialDays);
  const list = await pagarmeRequest('GET', `/plans?name=${encodeURIComponent(name)}&size=50`);
  const found = (list?.data || []).find((p) => p.name === name && p.status !== 'inactive' && p.status !== 'deleted');
  if (found) return found;

  return pagarmeRequest('POST', '/plans', {
    name,
    description: `VisuIA — Plano ${plan.name}`,
    statement_descriptor: 'VISUIA',
    currency: 'BRL',
    interval: 'month',
    interval_count: 1,
    billing_type: 'prepaid',
    payment_methods: ['credit_card'],
    installments: [1],
    minimum_price: plan.amount_cents,
    trial_period_days: trialDays,
    items: [{
      name: `Plano ${plan.name}`,
      quantity: 1,
      pricing_scheme: { scheme_type: 'unit', price: plan.amount_cents },
    }],
    metadata: { visuia_plan: String(plan.id) },
  });
}

// Link de pagamento da assinatura (só cartão — a Pagar.me não aceita Pix em
// assinatura recorrente). O período grátis vem do próprio plano.
export async function createSubscriptionLink(user, plan, { trialDays, entryFeeCents }) {
  const customer = await ensureCustomer(user);
  const pagarmePlan = await ensurePlan(plan, trialDays);

  const recurrence = { plan_id: pagarmePlan.id };
  if (entryFeeCents > 0) {
    recurrence.setup = {
      amount: entryFeeCents,
      description: 'Taxa de acesso ao teste grátis',
      payment_method: 'credit_card',
    };
  }

  const link = await pagarmeRequest('POST', '/paymentlinks', {
    type: 'subscription',
    name: `VisuIA ${plan.name} - usuario ${user.id}`.slice(0, 64),
    expires_in: 180,
    payment_settings: {
      accepted_payment_methods: ['credit_card'],
      credit_card_settings: { operation_type: 'auth_and_capture' },
    },
    cart_settings: { recurrences: [recurrence] },
    customer_settings: { customer_id: customer.id },
  });
  if (!link?.url) throw new Error('A Pagar.me não devolveu o endereço do link de pagamento');
  return link.url;
}

// Link de pagamento de um pacote avulso: cartão (à vista) ou Pix.
export async function createPackLink(user, pack) {
  const customer = await ensureCustomer(user);

  const link = await pagarmeRequest('POST', '/paymentlinks', {
    type: 'order',
    name: `VisuIA ${pack.label} - usuario ${user.id}`.slice(0, 64),
    expires_in: 180,
    max_paid_sessions: 1,
    payment_settings: {
      accepted_payment_methods: ['credit_card', 'pix'],
      credit_card_settings: {
        operation_type: 'auth_and_capture',
        installments: [{ number: 1, total: pack.amount_cents }],
      },
      pix_settings: { expires_in: 3600 },
    },
    cart_settings: {
      items: [{ name: pack.label, amount: pack.amount_cents, default_quantity: 1 }],
    },
    customer_settings: { customer_id: customer.id },
  });
  if (!link?.url) throw new Error('A Pagar.me não devolveu o endereço do link de pagamento');
  return link.url;
}
