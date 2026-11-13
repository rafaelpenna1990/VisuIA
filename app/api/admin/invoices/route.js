import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { listInvoiceQueue, countInvoiceQueue, setInvoiceIssued } from '../../../../lib/db.js';

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// GET ?key=...&status=pending|issued|all[&format=csv]
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const status = ['pending', 'issued', 'all'].includes(params.get('status')) ? params.get('status') : 'pending';
  const rows = listInvoiceQueue(status);

  if (params.get('format') === 'csv') {
    const header = ['Data do pagamento', 'Nome', 'CPF/CNPJ', 'E-mail', 'Celular', 'Valor (R$)', 'Descrição do serviço', 'Nota emitida', 'Número da nota'];
    const lines = rows.map((r) => [
      r.paid_at, r.customer_name, r.customer_document, r.customer_email, r.customer_phone,
      (r.amount_cents / 100).toFixed(2).replace('.', ','), r.description,
      r.issued ? 'sim' : 'não', r.invoice_number,
    ].map(csvCell).join(';'));
    return new NextResponse('﻿' + [header.join(';'), ...lines].join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="notas-${status}.csv"`,
      },
    });
  }

  return NextResponse.json({ invoices: rows, counts: countInvoiceQueue() });
}

// POST ?key=... { id, issued, invoice_number?, note? } — marca/desmarca como emitida.
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Pagamento inválido' }, { status: 400 });
  }
  const ok = setInvoiceIssued(
    id,
    !!body.issued,
    String(body.invoice_number || '').trim().slice(0, 60),
    String(body.note || '').trim().slice(0, 300)
  );
  if (!ok) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, counts: countInvoiceQueue() });
}
