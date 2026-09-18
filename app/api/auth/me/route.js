import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, email: user.email, credits_balance: user.credits_balance },
  });
}
