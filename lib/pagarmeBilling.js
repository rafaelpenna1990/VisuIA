// Regras de negócio da cobrança via Pagar.me: planos, clientes e links de
// pagamento. Os links de pagamento são páginas hospedadas pela Pagar.me
// (cartão e Pix) — nenhum dado de cartão passa pelo nosso servidor.
import { pagarmeRequest } from './pagarme.js';
import { onlyDigits } from './br.js';

// Nome do plano como o cliente vê na página de pagamento da Pagar.me. Quem
// identifica o plano para o webhook são os metadados (visuia_plan etc.), e
// não o nome. Planos antigos têm o formato "VisuIA|id|valor|dias" no nome —
// parsePagarmePlanName continua entendendo esses.
export function pagarmePlanName(plan, trialDays) {
  const base = `VisuIA Plano ${plan.name}`;
  return trialDays > 0 ? `${base} — ${trialDays} dias grátis` : base;
}

export function parsePagarmePlanName(name) {
  const parts = String(name || '').split('|');
  if (parts[0] !== 'VisuIA' || parts.length < 4) return null;
  return { planId: parts[1], amountCents: Number(parts[2]), trialDays: Number(parts[3]) };
}

// Descobre qual plano do VisuIA é um plano da Pagar.me (o objeto `plan` que
// vem dentro da assinatura). Devolve { planId, amountCents, trialDays } ou null.
export async function describeRemotePlan(planRef) {
  const fromName = parsePagarmePlanName(planRef?.name);
  if (fromName) return fromName;
  if (!planRef?.id) return null;

  const full = await pagarmeRequest('GET', `/plans/${planRef.id}`);
  const parsed = parsePagarmePlanName(full?.name);
  if (parsed) return parsed;

  const md = full?.metadata || {};
  if (!md.visuia_plan) return null;
  return {
    planId: String(md.visuia_plan),
    amountCents: Number(md.visuia_amount ?? 0) || 0,
    trialDays: Number(md.visuia_trial ?? full?.trial_period_days ?? 0) || 0,
  };
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

// Cria (ou atualiza) o cliente na Pagar.me. `extra` traz os dados do
// formulário de pagamento: { name, cpf, phone } — o CPF e o telefone ajudam
// o antifraude a aprovar a compra.
export async function ensureCustomer(user, extra) {
  const code = customerCodeForUser(user.id);
  const list = await pagarmeRequest('GET', `/customers?code=${encodeURIComponent(code)}`);
  const found = (list?.data || []).find((c) => c.code === code);

  const name = String(extra?.name || user.name || String(user.email || '').split('@')[0] || 'Cliente VisuIA').slice(0, 64);
  const body = {
    name,
    email: user.email,
    code,
    type: 'individual',
    metadata: { user_id: String(user.id) },
  };
  if (extra?.cpf) {
    body.document = onlyDigits(extra.cpf);
    body.document_type = 'CPF';
  }
  if (extra?.phone) body.phones = { mobile_phone: extra.phone };

  if (!found) return pagarmeRequest('POST', '/customers', body);
  if (!extra) return found;
  return pagarmeRequest('PUT', `/customers/${found.id}`, body);
}

function planMatches(p, plan, trialDays) {
  const md = p.metadata || {};
  return (
    p.status !== 'inactive' && p.status !== 'deleted' &&
    String(md.visuia_plan) === String(plan.id) &&
    Number(md.visuia_amount) === Number(plan.amount_cents) &&
    Number(md.visuia_trial || 0) === Number(trialDays || 0)
  );
}

export async function ensurePlan(plan, trialDays) {
  const baseName = pagarmePlanName(plan, trialDays);

  const body = (name) => ({
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
    ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
    items: [{
      name: `Plano ${plan.name}`,
      quantity: 1,
      pricing_scheme: { scheme_type: 'unit', price: plan.amount_cents },
    }],
    metadata: {
      visuia_plan: String(plan.id),
      visuia_amount: String(plan.amount_cents),
      visuia_trial: String(trialDays || 0),
    },
  });

  const list = await pagarmeRequest('GET', `/plans?name=${encodeURIComponent(baseName)}&size=50`);
  const found = (list?.data || []).find((p) => planMatches(p, plan, trialDays));
  if (found) return found;

  try {
    return await pagarmeRequest('POST', '/plans', body(baseName));
  } catch (err) {
    // Se a Pagar.me não aceitar dois planos com o mesmo nome (por exemplo,
    // depois de mudar o preço), tenta de novo com o valor no nome.
    if (err.status === 400 || err.status === 409 || err.status === 422) {
      const priced = `${baseName} (R$ ${(plan.amount_cents / 100).toFixed(2).replace('.', ',')})`;
      return pagarmeRequest('POST', '/plans', body(priced));
    }
    throw err;
  }
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

// ── Pagamento com formulário próprio (cartão tokenizado no navegador) ──────

// Guarda o cartão (a partir do token gerado no navegador) na carteira do
// cliente e devolve o id do cartão.
export async function saveCardFromToken(customerId, token) {
  const card = await pagarmeRequest('POST', `/customers/${customerId}/cards`, { token });
  if (!card?.id) throw new Error('A Pagar.me não aceitou o cartão');
  return card.id;
}

// Assinatura no cartão. O período grátis vem do plano.
export async function createCardSubscription(user, plan, { trialDays, customerId, cardId }) {
  const pagarmePlan = await ensurePlan(plan, trialDays);
  return pagarmeRequest('POST', '/subscriptions', {
    plan_id: pagarmePlan.id,
    customer_id: customerId,
    payment_method: 'credit_card',
    card_id: cardId,
    installments: 1,
    statement_descriptor: 'VISUIA',
    metadata: { user_id: String(user.id), plan: String(plan.id) },
  });
}

// Pedido de um pacote avulso, por cartão (card_id) ou Pix.
export async function createPackOrder(user, pack, packKey, { customerId, cardId, method }) {
  const payment = method === 'pix'
    ? { payment_method: 'pix', pix: { expires_in: 3600 } }
    : {
        payment_method: 'credit_card',
        credit_card: {
          installments: 1,
          statement_descriptor: 'VISUIA',
          operation_type: 'auth_and_capture',
          card_id: cardId,
        },
      };

  return pagarmeRequest('POST', '/orders', {
    customer_id: customerId,
    items: [{ amount: pack.amount_cents, description: pack.label, quantity: 1, code: packKey }],
    payments: [payment],
    metadata: { user_id: String(user.id), pack: packKey },
  });
}
