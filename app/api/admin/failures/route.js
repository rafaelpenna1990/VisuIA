import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { getRecentFailures } from '../../../../lib/db.js';

// Powers the admin "Erros" tab — every failed generation from the last 7
// days, grouped by model so a pattern (one broken model vs. scattered
// one-off failures) jumps out without having to read every single row.
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const date = request.nextUrl.searchParams.get('date') || undefined;
  const failures = getRecentFailures(date ? { date } : { days: 7 });

  const byModel = {};
  for (const f of failures) {
    if (!byModel[f.model]) byModel[f.model] = [];
    byModel[f.model].push(f);
  }
  const groups = Object.entries(byModel)
    .map(([model, items]) => ({ model, count: items.length, items }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ total: failures.length, groups });
}
