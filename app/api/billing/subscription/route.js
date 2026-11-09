import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';
import { getActiveSubscriptionForUser, getPlanById } from '../../../../lib/db.js';
import { inspectPagarmeSubscription } from '../../../../lib/pagarmeCardChange.js';

// Powers the "Assinatura" tab in /conta — the user's current plan, if any.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const sub = getActiveSubscriptionForUser(user.id);
  if (!sub) return NextResponse.json({ subscription: null });

  const plan = getPlanById(sub.plan);

  // Assinaturas da Pagar.me: mostra o cartão usado e avisa se a última
  // cobrança foi recusada (para a pessoa trocar o cartão). Se a consulta
  // falhar, a tela continua funcionando sem essas informações.
  let card = null;
  let paymentFailed = false;
  if (sub.provider === 'pagarme') {
    try {
      const info = await inspectPagarmeSubscription(sub);
      card = info.card;
      paymentFailed = info.paymentFailed;
    } catch (err) {
      console.error('[subscription] não consegui consultar a Pagar.me:', err.message);
    }
  }

  return NextResponse.json({
    subscription: {
      plan: sub.plan,
      planName: plan?.name || sub.plan,
      status: sub.status,
      provider: sub.provider || 'stripe',
      tokensPerMonth: plan?.tokens || 0,
      currentPeriodEnd: sub.current_period_end,
      card,
      paymentFailed,
    },
  });
}
