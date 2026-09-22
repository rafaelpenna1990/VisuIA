import { NextResponse } from 'next/server';
import { getAllPlans, getSetting } from '../../../lib/db.js';

// Public — the subscription modal and /conta page read the current plans
// (name, price, tokens) from here instead of a hardcoded file, so changes
// made in /admin show up immediately everywhere without a redeploy.
export async function GET() {
  const plans = getAllPlans();
  const trialBonusTokens = Number(getSetting('trial_bonus_tokens', '500'));
  const trialEntryFeeCents = Number(getSetting('trial_entry_fee_cents', '0'));
  return NextResponse.json({ plans, trialBonusTokens, trialEntryFeeCents });
}
