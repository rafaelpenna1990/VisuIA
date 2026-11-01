import { isPagarmeConfigured } from './pagarme.js';

// Qual provedor de pagamento cobra NOVAS assinaturas e compras avulsas.
// Controlado pela variável BILLING_PROVIDER ("stripe" por padrão). Quem já
// tem assinatura continua no provedor gravado em subscriptions.provider —
// só as novas vendas seguem esta variável.
export function getBillingProvider() {
  const value = (process.env.BILLING_PROVIDER || 'stripe').trim().toLowerCase();
  return value === 'pagarme' ? 'pagarme' : 'stripe';
}

// Igual ao anterior, mas permite TESTAR a Pagar.me sem afetar os clientes:
// os e-mails listados em PAGARME_TEST_EMAILS (separados por vírgula) usam a
// Pagar.me mesmo com BILLING_PROVIDER=stripe.
export function getBillingProviderForUser(user) {
  if (getBillingProvider() === 'pagarme') return 'pagarme';
  const testers = (process.env.PAGARME_TEST_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user?.email && testers.includes(String(user.email).toLowerCase()) && isPagarmeConfigured()) {
    return 'pagarme';
  }
  return 'stripe';
}
