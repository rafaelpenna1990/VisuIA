import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { getDisabledModels, setDisabledModels } from '../../../../lib/db.js';
import {
  t2iModels, i2iModels, t2vModels, i2vModels, v2vModels, lipsyncModels,
} from '../../../../packages/studio/src/models.js';

const CATEGORIES = [
  { key: 'image_generate', label: 'Imagem — Gerar (texto→imagem)', models: t2iModels },
  { key: 'image_edit', label: 'Imagem — Editar', models: i2iModels },
  { key: 'video_generate', label: 'Vídeo — Gerar (texto→vídeo)', models: t2vModels },
  { key: 'video_animate', label: 'Vídeo — Animar imagem', models: i2vModels },
  { key: 'video_to_video', label: 'Vídeo — Vídeo para vídeo', models: v2vModels },
  { key: 'lipsync', label: 'Sincronia Labial', models: lipsyncModels },
];

// GET: every model across all studios, grouped by category, with which
// ones are currently disabled — powers the admin "Modelos" tab.
// POST { modelId, disabled }: toggles a single model.
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const disabled = new Set(getDisabledModels());
  const categories = CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    models: c.models.map((m) => ({ id: m.id, name: m.name, disabled: disabled.has(m.id) })),
  }));
  return NextResponse.json({ categories });
}

export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { modelId, disabled } = await request.json();
  if (!modelId) return NextResponse.json({ error: 'modelId obrigatório' }, { status: 400 });

  const current = new Set(getDisabledModels());
  if (disabled) current.add(modelId);
  else current.delete(modelId);
  setDisabledModels([...current]);

  return NextResponse.json({ ok: true, disabled: [...current] });
}
