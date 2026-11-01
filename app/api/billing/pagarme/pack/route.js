import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../../lib/auth.js';
import { PACKS } from '../../../../../lib/packs.js';
import { getBillingProviderForUser } from '../../../../../lib/billingProvider.js';
import { ensureCustomer, saveCardFromToken, createPackOrder } from '../../../../../lib/pagarmeBilling.js';
import { creditPaidCharge } from '../../../../../lib/pagarmeSync.js';
import { readBuyerData } from '../../../../../lib/pagarmeForm.js';

// Compra de um pacote avulso: cartão (token gerado no navegador) ou Pix.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (getBillingProviderForUser(user) !== 'pagarme') {
    return NextResponse.json({ error: 'Pagamento por esta via não está habilitado' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const pack = PACKS[body.pack];
  if (!pack) return NextResponse.json({ error: 'Pacote inválido' }, { status: 400 });
  const method = body.method === 'pix' ? 'pix' : 'card';
  if (method === 'card' && !body.token) {
    return NextResponse.json({ error: 'Cartão não informado' }, { status: 400 });
  }

  const buyer = readBuyerData(body);
  if (buyer.error) return NextResponse.json({ error: buyer.error }, { status: 400 });

  try {
    const customer = await ensureCustomer(user, buyer.extra);
    const cardId = method === 'card' ? await saveCardFromToken(customer.id, body.token) : null;
    const order = await createPackOrder(user, pack, body.pack, { customerId: customer.id, cardId, method });
    const charge = order?.charges?.[0];
    if (!charge) throw new Error('A Pagar.me não devolveu a cobrança');

    if (method === 'pix') {
      const tx = charge.last_transaction || {};
      if (!tx.qr_code) throw new Error('A Pagar.me não devolveu o código Pix');
      return NextResponse.json({
        ok: true,
        pix: { chargeId: charge.id, qr_code: tx.qr_code, qr_code_url: tx.qr_code_url || null, expires_at: tx.expires_at || null },
      });
    }

    if (charge.status === 'paid') {
      await creditPaidCharge(charge.id);
      return NextResponse.json({ ok: true, paid: true });
    }
    const reason = charge.last_transaction?.acquirer_message || charge.last_transaction?.gateway_response?.errors?.[0]?.message;
    return NextResponse.json(
      { error: `Pagamento não aprovado${reason ? `: ${reason}` : ''}. Confira os dados ou tente outro cartão.` },
      { status: 402 }
    );
  } catch (err) {
    return NextResponse.json({ error: `Não foi possível concluir: ${err.message}` }, { status: 502 });
  }
}
