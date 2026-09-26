import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth.js';
import { getUserTransactions } from '../../../lib/db.js';

// Powers the "Histórico" tab in /conta — every credit movement for the
// logged-in user (subscriptions, top-ups, generation charges and their
// refunds), newest first. Only ever returns the caller's own rows.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const transactions = getUserTransactions(user.id, 200);
  return NextResponse.json({ transactions });
}
