// Validação dos dados que o formulário de pagamento envia ao servidor.
import { isValidCpf, parseBrazilianPhone } from './br.js';

export function pagarmeFormEnabled() {
  const hasKey = (process.env.PAGARME_PUBLIC_KEY || '').trim().length > 0;
  const mode = (process.env.PAGARME_CHECKOUT_MODE || 'form').trim().toLowerCase();
  return hasKey && mode !== 'link';
}

// O cartão pode ser tokenizado no navegador (usado na troca de cartão, mesmo
// quando a venda nova usa a página hospedada da Pagar.me).
export function pagarmeTokenizationAvailable() {
  return (process.env.PAGARME_PUBLIC_KEY || '').trim().length > 0;
}

export function getPagarmePublicKey() {
  return (process.env.PAGARME_PUBLIC_KEY || '').trim();
}

// Devolve { extra } com nome/CPF/telefone prontos para a Pagar.me, ou
// { error } com a mensagem para mostrar ao cliente.
export function readBuyerData(body) {
  const name = String(body?.name || '').trim();
  if (name.length < 3) return { error: 'Informe o nome completo' };
  if (!isValidCpf(body?.cpf)) return { error: 'CPF inválido' };
  const phone = parseBrazilianPhone(body?.phone);
  if (!phone) return { error: 'Celular inválido — informe com DDD' };
  return { extra: { name, cpf: body.cpf, phone } };
}
