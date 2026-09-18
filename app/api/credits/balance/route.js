import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  return NextResponse.json({ credits_balance: user.credits_balance });
}
