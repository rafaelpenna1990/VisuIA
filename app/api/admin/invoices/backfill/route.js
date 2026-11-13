import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import { pagarmeRequest, isPagarmeConfigured } from '../../../../../lib/pagarme.js';
import { getTransactionBySessionId, hasInvoiceCharge, countInvoiceQueue } from '../../../../../lib/db.js';
import { loadInvoiceCustomer, recordInvoiceForCharge } from '../../../../../lib/invoiceQueue.js';

// Importa para a fila os pagamentos aprovados ANTES de a fila existir.
// Só entram cobranças que o site já creditou ao cliente (evita testes soltos
// feitos direto na Pagar.me). Pode rodar várias vezes: não duplica.
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!isPagarmeConfigured()) {
    return NextResponse.json({ error: 'Pagar.me não configurada' }, { status: 503 });
  }

  let added = 0;
  let skipped = 0;
  let seen = 0;
  try {
    for (let page = 1; page <= 10; page += 1) {
      const result = await pagarmeRequest('GET', `/charges?status=paid&page=${page}&size=100`);
      const charges = result?.data || [];
      for (const charge of charges) {
        seen += 1;
        if (!charge?.id || hasInvoiceCharge(charge.id)) { skipped += 1; continue; }
        const tx = getTransactionBySessionId(`pagarme:charge:${charge.id}`);
        if (!tx) { skipped += 1; continue; }
        const customer = await loadInvoiceCustomer(charge);
        if (recordInvoiceForCharge(charge, customer, tx.user_id)) added += 1; else skipped += 1;
      }
      if (charges.length < 100) break;
    }
  } catch (err) {
    return NextResponse.json({ error: `Falha ao ler a Pagar.me: ${err.message}`, added, counts: countInvoiceQueue() }, { status: 502 });
  }
  return NextResponse.json({ ok: true, seen, added, skipped, counts: countInvoiceQueue() });
}
