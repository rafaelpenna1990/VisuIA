import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { getAllSubscribers, getSetting } from '../../../../lib/db.js';

export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const trialDays = Number(getSetting('trial_days', '7')) || 7;
  return NextResponse.json({ subscribers: getAllSubscribers(), trialDays });
}
