import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../../lib/auth.js';
import { pagarmeRequest } from '../../../../../lib/pagarme.js';
import { creditPaidCharge, userFromCustomer } from '../../../../../lib/pagarmeSync.js';

// O navegador pergunta aqui se o Pix já foi pago. Se foi, creditamos na hora
// (sem esperar o aviso da Pagar.me); o crédito nunca é feito em dobro.
export async function GET(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^ch_[A-Za-z0-9]+$/.test(id)) return NextResponse.json({ error: 'Cobrança inválida' }, { status: 400 });

  try {
    const charge = await pagarmeRequest('GET', `/charges/${id}`);
    const owner = await userFromCustomer(charge.customer);
    if (!owner || owner.id !== user.id) {
      return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 });
    }
    if (charge.status === 'paid') {
      await creditPaidCharge(id);
      return NextResponse.json({ paid: true });
    }
    return NextResponse.json({ paid: false, status: charge.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
