import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';
import { getCollectionById, renameCollection, deleteCollection } from '../../../../lib/db.js';

export async function PATCH(request, { params }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  const existing = getCollectionById(id);
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Coleção não encontrada' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Nome da coleção é obrigatório' }, { status: 400 });
  }
  if (name.length > 60) {
    return NextResponse.json({ error: 'Nome muito longo (máx. 60 caracteres)' }, { status: 400 });
  }

  renameCollection(user.id, id, name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  const existing = getCollectionById(id);
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Coleção não encontrada' }, { status: 404 });
  }

  deleteCollection(user.id, id);
  return NextResponse.json({ ok: true });
}
