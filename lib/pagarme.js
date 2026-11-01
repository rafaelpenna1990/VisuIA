// Cliente mínimo da API v5 da Pagar.me (só servidor — a chave secreta nunca
// vai pro navegador). Autenticação: HTTP Basic com a chave secreta como
// usuário e senha vazia.
//
// Endereço: as chaves sk_test_ criadas no portal Stone funcionam em
// api.pagar.me (testado com GET /plans). Se um dia precisar apontar para
// outro endereço (ex.: sdx-api.pagar.me), defina PAGARME_API_BASE.
const DEFAULT_BASE = 'https://api.pagar.me/core/v5';

function getSecretKey() {
  return (process.env.PAGARME_SECRET_KEY || '').trim();
}

export function isPagarmeConfigured() {
  return getSecretKey().length > 0;
}

export function getPagarmeBaseUrl() {
  const override = (process.env.PAGARME_API_BASE || '').trim().replace(/\/+$/, '');
  return override || DEFAULT_BASE;
}

export function getPagarmeKeyKind() {
  const key = getSecretKey();
  if (!key) return 'ausente';
  return key.startsWith('sk_test') ? 'teste' : 'produção';
}

// Faz uma chamada à API da Pagar.me e devolve o JSON. Em caso de erro lança
// uma Error com a mensagem da Pagar.me (e .status / .details pra debug).
export async function pagarmeRequest(method, path, body) {
  const key = getSecretKey();
  if (!key) throw new Error('PAGARME_SECRET_KEY não configurada');

  const response = await fetch(`${getPagarmeBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!response.ok) {
    const detail = data?.errors
      ? Object.entries(data.errors).map(([field, msgs]) => `${field}: ${[].concat(msgs).join(', ')}`).join(' | ')
      : null;
    const err = new Error(data?.message ? `${data.message}${detail ? ` (${detail})` : ''}` : `Pagar.me respondeu ${response.status}`);
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return data;
}
