import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';
import { getActiveSubscriptionForUser } from '../../../../lib/db.js';
import { PLANS } from '../../../../lib/plans.js';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const sub = getActiveSubscriptionForUser(user.id);
  if (!sub) return NextResponse.json({ subscription: null });

  return NextResponse.json({
    subscription: {
      plan: sub.plan,
      planName: PLANS[sub.plan]?.name || sub.plan,
      status: sub.status,
      tokensPerMonth: PLANS[sub.plan]?.tokens || 0,
      currentPeriodEnd: sub.current_period_end,
    },
  });
}