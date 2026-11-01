// Validações brasileiras simples (CPF e celular), usadas no formulário de
// pagamento e repetidas no servidor.
export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(cpf[i]) * (len + 1 - i);
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== Number(cpf[len])) return false;
  }
  return true;
}

// Celular com DDD: 10 ou 11 dígitos (aceita +55 na frente).
export function parseBrazilianPhone(value) {
  let digits = onlyDigits(value);
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 11) return null;
  return { country_code: '55', area_code: digits.slice(0, 2), number: digits.slice(2) };
}
