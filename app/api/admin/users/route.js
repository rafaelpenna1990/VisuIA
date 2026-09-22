import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { searchUsers, countUsers } from '../../../../lib/db.js';

const PAGE_SIZE = 25;

export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get('q') || '';
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const users = searchUsers(q, PAGE_SIZE, offset);
  const total = countUsers(q);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return NextResponse.json({ users, total, page, totalPages, pageSize: PAGE_SIZE });
}
