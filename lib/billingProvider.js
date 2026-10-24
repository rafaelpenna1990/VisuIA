// Qual provedor de pagamento cobra NOVAS assinaturas e compras avulsas.
// Controlado pela variável BILLING_PROVIDER ("stripe" por padrão). Quem já
// tem assinatura continua no provedor gravado em subscriptions.provider —
// só as novas vendas seguem esta variável.
export function getBillingProvider() {
  const value = (process.env.BILLING_PROVIDER || 'stripe').trim().toLowerCase();
  return value === 'pagarme' ? 'pagarme' : 'stripe';
}
