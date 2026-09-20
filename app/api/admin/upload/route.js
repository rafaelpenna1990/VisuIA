import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'data', 'uploads');

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.webm'];

// Handles two kinds of uploads, chosen by the "target" field:
//   target=logo             → saved as logo.<ext>, replacing any previous logo
//   target=carousel&slot=X  → saved as carousel/<slot>.<ext> (slot like
//                              "imagem-1", "video-2", etc — matches
//                              ExampleCarousel's naming convention)
// Files land on the persistent volume (see /api/assets), not public/, so
// they survive redeploys.
export async function POST(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const target = formData.get('target');
  const slot = formData.get('slot');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  }

  const originalExt = path.extname(file.name || '').toLowerCase();
  if (!ALLOWED_EXT.includes(originalExt)) {
    return NextResponse.json({ error: `Formato não aceito: ${originalExt || '(sem extensão)'}` }, { status: 400 });
  }

  let destRelPath;
  if (target === 'logo') {
    destRelPath = `logo${originalExt}`;
  } else if (target === 'carousel' && slot) {
    if (String(slot).includes('..') || String(slot).includes('/')) {
      return NextResponse.json({ error: 'Slot inválido' }, { status: 400 });
    }
    destRelPath = path.join('carousel', `${slot}${originalExt}`);
  } else {
    return NextResponse.json({ error: 'Alvo do upload inválido' }, { status: 400 });
  }

  const destPath = path.join(UPLOADS_DIR, destRelPath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  // When replacing a logo/slot, remove any OTHER extension previously used
  // for that same slot first (e.g. swapping imagem-1.jpg for imagem-1.mp4
  // shouldn't leave the old .jpg lying around and winning by cache).
  const destDir = path.dirname(destPath);
  const destBase = path.basename(destRelPath, originalExt);
  try {
    for (const f of fs.readdirSync(destDir)) {
      const fBase = path.basename(f, path.extname(f));
      if (fBase === destBase && f !== path.basename(destPath)) {
        fs.unlinkSync(path.join(destDir, f));
      }
    }
  } catch {
    // destDir may not exist yet on first upload — fine, mkdirSync above handles that.
  }

  const arrayBuffer = await file.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));

  return NextResponse.json({ ok: true, url: `/api/assets/${destRelPath.split(path.sep).join('/')}` });
}
