import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth.js';
import { listCollectionsForUser, createCollection } from '../../../lib/db.js';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const collections = listCollectionsForUser(user.id);
  return NextResponse.json({ collections });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Nome da coleção é obrigatório' }, { status: 400 });
  }
  if (name.length > 60) {
    return NextResponse.json({ error: 'Nome muito longo (máx. 60 caracteres)' }, { status: 400 });
  }

  const collection = createCollection(user.id, name);
  return NextResponse.json({ collection: { ...collection, count: 0 } });
}
