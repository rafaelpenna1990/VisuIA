import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth.js';
import { getCharacterById, deleteCharacter } from '../../../../lib/db.js';

export async function DELETE(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const id = Number(params.id);
  const existing = getCharacterById(id);
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Personagem não encontrado' }, { status: 404 });
  }

  deleteCharacter(user.id, id);
  return NextResponse.json({ ok: true });
}
