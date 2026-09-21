import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../../lib/adminAuth.js';
import {
  getUserById,
  getUserTransactions,
  getUserGenerations,
  getUserSubscriptionHistory,
} from '../../../../../lib/db.js';

// Powers the "view details" panel in the admin Usuários tab — a full
// picture of one person: profile, credit ledger (subscriptions, top-ups,
// admin adjustments), and everything they've generated.
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const userId = Number(request.nextUrl.searchParams.get('userId'));
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });

  const user = getUserById(userId);
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      credits_balance: user.credits_balance,
      created_at: user.created_at,
      google_id: user.google_id,
      facebook_id: user.facebook_id,
    },
    transactions: getUserTransactions(userId),
    generations: getUserGenerations(userId),
    subscriptions: getUserSubscriptionHistory(userId),
  });
}
