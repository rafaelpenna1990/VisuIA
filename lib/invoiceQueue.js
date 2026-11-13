// Fila de notas fiscais a emitir (NFS-e).
//
// Cada pagamento aprovado na Pagar.me que gerou crédito para o cliente entra
// na fila com os dados que o Conta Azul pede para emitir a nota. Tudo aqui é
// idempotente: registrar a mesma cobrança duas vezes não duplica a linha, e
// uma falha neste arquivo nunca pode impedir o crédito do cliente (quem
// chama já engole os erros).
import { pagarmeRequest } from './pagarme.js';
import { recordInvoiceCharge, getTransactionBySessionId } from './db.js';

function formatPhone(customer) {
  const mobile = customer?.phones?.mobile_phone;
  if (mobile?.area_code && mobile?.number) return `(${mobile.area_code}) ${mobile.number}`;
  return '';
}

// Dados do comprador. Usa o que veio na cobrança; se faltar o documento,
// busca o cliente na Pagar.me.
export async function loadInvoiceCustomer(charge) {
  let customer = charge?.customer || null;
  if ((!customer || !customer.document) && customer?.id) {
    try { customer = await pagarmeRequest('GET', `/customers/${customer.id}`); } catch { /* usa o que tem */ }
  }
  return {
    name: customer?.name || '',
    document: String(customer?.document || '').replace(/\D/g, ''),
    email: customer?.email || '',
    phone: formatPhone(customer),
  };
}

// Texto sugerido para a descrição do serviço na nota.
export function invoiceDescription(transactionDescription) {
  const detail = String(transactionDescription || '')
    .replace(/\s+—\s+(renovação mensal|fim do período grátis)$/i, '')
    .replace(/^Recarga via Pagar\.me$/i, 'créditos avulsos')
    .replace(/^Assinatura\s+/i, 'plano ');
  return `Licença de uso da plataforma VisuIA — ${detail || 'créditos'}`;
}

// Registra a cobrança na fila. `customer` vem de loadInvoiceCustomer.
// Devolve true se criou uma linha nova.
export function recordInvoiceForCharge(charge, customer, userId) {
  const amountCents = Number(charge.paid_amount ?? charge.amount ?? 0);
  if (!(amountCents > 0)) return false;
  const tx = getTransactionBySessionId(`pagarme:charge:${charge.id}`);
  const paidAt = charge.paid_at || charge.last_transaction?.created_at || charge.updated_at || new Date().toISOString();
  return recordInvoiceCharge({
    charge_id: charge.id,
    user_id: userId ?? tx?.user_id ?? null,
    paid_at: String(paidAt),
    amount_cents: amountCents,
    description: invoiceDescription(tx?.description),
    customer_name: customer?.name,
    customer_document: customer?.document,
    customer_email: customer?.email,
    customer_phone: customer?.phone,
  });
}
