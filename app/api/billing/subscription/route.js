import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';
import { getActiveSubscriptionForUser, getPlanById } from '../../../../lib/db.js';

// Powers the "Assinatura" tab in /conta — the user's current plan, if any.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const sub = getActiveSubscriptionForUser(user.id);
  if (!sub) return NextResponse.json({ subscription: null });

  const plan = getPlanById(sub.plan);

  return NextResponse.json({
    subscription: {
      plan: sub.plan,
      planName: plan?.name || sub.plan,
      status: sub.status,
      tokensPerMonth: plan?.tokens || 0,
      currentPeriodEnd: sub.current_period_end,
    },
  });
}
