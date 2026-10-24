// Cliente mínimo da API v5 da Pagar.me (só servidor — a chave secreta nunca
// vai pro navegador). Autenticação: HTTP Basic com a chave secreta como
// usuário e senha vazia. Chave de teste (sk_test_...) usa o sandbox.
const PROD_BASE = 'https://api.pagar.me/core/v5';
const SANDBOX_BASE = 'https://sdx-api.pagar.me/core/v5';

function getSecretKey() {
  return (process.env.PAGARME_SECRET_KEY || '').trim();
}

export function isPagarmeConfigured() {
  return getSecretKey().length > 0;
}

function getBaseUrl() {
  return getSecretKey().startsWith('sk_test') ? SANDBOX_BASE : PROD_BASE;
}

// Faz uma chamada à API da Pagar.me e devolve o JSON. Em caso de erro lança
// uma Error com a mensagem da Pagar.me (e .status / .details pra debug).
export async function pagarmeRequest(method, path, body) {
  const key = getSecretKey();
  if (!key) throw new Error('PAGARME_SECRET_KEY não configurada');

  const response = await fetch(`${getBaseUrl()}${path}`, {
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
