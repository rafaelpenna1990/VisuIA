import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { getAllSettings, setSetting } from '../../../../lib/db.js';

export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return NextResponse.json({ settings: getAllSettings() });
}

// Body: { usd_to_brl, price_markup, trial_bonus_tokens, signup_free_credits }
// Any subset — only the keys present get updated. Takes effect immediately,
// no redeploy needed (lib/pricing.js reads these live on every request).
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const body = await request.json();
  const allowedKeys = ['usd_to_brl', 'price_markup', 'trial_bonus_tokens', 'signup_free_credits'];
  for (const key of allowedKeys) {
    if (body[key] !== undefined && body[key] !== '') {
      setSetting(key, body[key]);
    }
  }
  return NextResponse.json({ settings: getAllSettings() });
}
