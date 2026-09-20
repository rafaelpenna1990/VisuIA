import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { searchUsers } from '../../../../lib/db.js';

export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get('q') || '';
  const users = searchUsers(q);
  return NextResponse.json({ users });
}
