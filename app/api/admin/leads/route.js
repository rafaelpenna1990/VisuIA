import { NextResponse } from 'next/server';
import { listUsers } from '../../../../lib/db.js';

export async function GET(request) {
  const key = request.nextUrl.searchParams.get('key');
  const expected = process.env.ADMIN_SECRET;

  if (!expected) {
    return NextResponse.json({ error: 'ADMIN_SECRET não configurada no servidor' }, { status: 500 });
  }
  if (!key || key !== expected) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }

  const users = listUsers();
  return NextResponse.json({ users });
}