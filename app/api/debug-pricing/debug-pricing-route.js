import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { estimatedChargeBRL } from '../../../../lib/pricing.js';
import { getSetting } from '../../../../lib/db.js';

// TEMPORARY diagnostic route — shows exactly what the server computes
// for a given model, plus current settings. Safe to delete once the
// credit-check bug is confirmed fixed.
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const model = request.nextUrl.searchParams.get('model') || 'seedance-lite-t2v';
  const kind = request.nextUrl.searchParams.get('kind') || 'video';

  return NextResponse.json({
    model,
    kind,
    usd_to_brl: getSetting('usd_to_brl', null),
    price_markup: getSetting('price_markup', null),
    estimate_brl: estimatedChargeBRL(kind, model),
    estimate_brl_no_model: estimatedChargeBRL(kind, undefined),
  });
}
