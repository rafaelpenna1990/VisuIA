import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../../lib/auth.js';
import { moveGenerationToCollection } from '../../../../../lib/db.js';

// Move uma geração pra dentro de uma coleção, ou de volta pra "sem
// coleção" quando collection_id vem null/ausente no corpo da requisição.
export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  const body = await request.json().catch(() => ({}));
  const collectionId = body.collection_id === null || body.collection_id === undefined
    ? null
    : Number(body.collection_id);

  try {
    moveGenerationToCollection(user.id, id, collectionId);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
