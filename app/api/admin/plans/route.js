import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { getAllPlans, updatePlan } from '../../../../lib/db.js';

export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return NextResponse.json({ plans: getAllPlans() });
}

// Body: { id, name, amount_cents, tokens } — updates one plan at a time.
// Existing subscribers keep whatever they already agreed to pay (Stripe
// subscriptions store their own price) — this only changes what NEW
// subscribers see and get charged going forward.
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id, name, amount_cents, tokens, promo_amount_cents } = await request.json();
  if (!id || !name || !Number.isFinite(amount_cents) || !Number.isFinite(tokens)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  updatePlan(id, { name, amount_cents, tokens, promo_amount_cents });
  return NextResponse.json({ plans: getAllPlans() });
}
