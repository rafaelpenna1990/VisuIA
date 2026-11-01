import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../../lib/auth.js';
import { getPlanById, getSetting } from '../../../../../lib/db.js';
import { getBillingProviderForUser } from '../../../../../lib/billingProvider.js';
import { ensureCustomer, saveCardFromToken, createCardSubscription } from '../../../../../lib/pagarmeBilling.js';
import { ensureLocalSubscription } from '../../../../../lib/pagarmeSync.js';
import { readBuyerData } from '../../../../../lib/pagarmeForm.js';

// Cria a assinatura depois que o navegador gerou o token do cartão
// (nenhum número de cartão passa por aqui).
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (getBillingProviderForUser(user) !== 'pagarme') {
    return NextResponse.json({ error: 'Pagamento por esta via não está habilitado' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const plan = getPlanById(body.plan);
  if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
  if (!body.token) return NextResponse.json({ error: 'Cartão não informado' }, { status: 400 });

  const buyer = readBuyerData(body);
  if (buyer.error) return NextResponse.json({ error: buyer.error }, { status: 400 });

  const trialDays = Number(getSetting('trial_days', '7')) || 7;

  try {
    const customer = await ensureCustomer(user, buyer.extra);
    const cardId = await saveCardFromToken(customer.id, body.token);
    const subscription = await createCardSubscription(user, plan, { trialDays, customerId: customer.id, cardId });
    if (['canceled', 'failed'].includes(subscription?.status)) {
      return NextResponse.json({ error: 'O cartão foi recusado. Confira os dados ou tente outro cartão.' }, { status: 402 });
    }
    await ensureLocalSubscription(subscription.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: `Não foi possível concluir: ${err.message}` }, { status: 502 });
  }
}
