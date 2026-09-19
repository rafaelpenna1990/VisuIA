import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth.js';
import { listGenerationsForUser } from '../../../lib/db.js';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const generations = listGenerationsForUser(user.id);
  return NextResponse.json({ generations });
}