import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../../lib/auth.js';
import { getActiveSubscriptionForUser, getPlanById } from '../../../../../lib/db.js';
import { ensureCustomer, saveCardFromToken } from '../../../../../lib/pagarmeBilling.js';
import { readBuyerData, getPagarmePublicKey, pagarmeTokenizationAvailable } from '../../../../../lib/pagarmeForm.js';
import { inspectPagarmeSubscription, changeSubscriptionCard } from '../../../../../lib/pagarmeCardChange.js';

function pagarmeSubscriptionOf(user) {
  const sub = getActiveSubscriptionForUser(user.id);
  return sub && sub.provider === 'pagarme' ? sub : null;
}

// Dados para abrir o formulário de troca de cartão.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const sub = pagarmeSubscriptionOf(user);
  if (!sub) return NextResponse.json({ error: 'Nenhuma assinatura da Pagar.me encontrada' }, { status: 404 });
  if (!pagarmeTokenizationAvailable()) return NextResponse.json({ error: 'Troca de cartão indisponível' }, { status: 503 });

  try {
    const info = await inspectPagarmeSubscription(sub);
    const plan = getPlanById(info.planId);
    return NextResponse.json({
      pagarme_form: {
        kind: 'card-change',
        publicKey: getPagarmePublicKey(),
        plan: { id: plan?.id, name: plan?.name || sub.plan, amount_cents: plan?.amount_cents || 0 },
        payNow: info.paymentFailed,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `Não foi possível abrir a troca de cartão: ${err.message}` }, { status: 502 });
  }
}

// Recebe o token do cartão novo (gerado no navegador) e troca o cartão.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const sub = pagarmeSubscriptionOf(user);
  if (!sub) return NextResponse.json({ error: 'Nenhuma assinatura da Pagar.me encontrada' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (!body.token) return NextResponse.json({ error: 'Cartão não informado' }, { status: 400 });
  const buyer = readBuyerData(body);
  if (buyer.error) return NextResponse.json({ error: buyer.error }, { status: 400 });

  try {
    const customer = await ensureCustomer(user, buyer.extra);
    const cardId = await saveCardFromToken(customer.id, body.token);
    const result = await changeSubscriptionCard(user, sub, cardId);
    return NextResponse.json({ ok: true, mode: result.mode });
  } catch (err) {
    if (err.userMessage) return NextResponse.json({ error: err.userMessage }, { status: 402 });
    return NextResponse.json({ error: `Não foi possível trocar o cartão: ${err.message}` }, { status: 502 });
  }
}
