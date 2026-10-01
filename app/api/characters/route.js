import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth.js';
import { listCharactersForUser, createCharacter } from '../../../lib/db.js';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const characters = listCharactersForUser(user.id);
  return NextResponse.json({ characters });
}

// O upload da foto em si já passa pelo /api/upload de sempre — aqui só
// salvamos o nome + a URL já hospedada que o Studio recebeu de volta.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const referenceImageUrl = String(body.reference_image_url || '').trim();
  if (!name) return NextResponse.json({ error: 'Nome do personagem é obrigatório' }, { status: 400 });
  if (name.length > 60) return NextResponse.json({ error: 'Nome muito longo (máx. 60 caracteres)' }, { status: 400 });
  if (!referenceImageUrl) return NextResponse.json({ error: 'Foto de referência é obrigatória' }, { status: 400 });
  const character = createCharacter(user.id, name, referenceImageUrl);
  return NextResponse.json({ character });
}
