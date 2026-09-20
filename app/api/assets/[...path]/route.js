import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Serves admin-uploaded files (logo, carousel photos/videos) straight from
// the persistent volume (the same disk the SQLite DB lives on — see
// lib/db.js's DB_PATH), instead of the app's public/ folder. Files placed
// in public/ do NOT survive a redeploy on Railway; this directory does.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'data', 'uploads');

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(request, { params }) {
  const segments = params.path || [];
  // Guard against path traversal — only allow plain filenames/segments.
  if (segments.some((s) => s.includes('..') || s.includes('/'))) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 });
  }

  const filePath = path.join(UPLOADS_DIR, ...segments);
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: 'Caminho inválido' }, { status: 400 });
  }

  // Prefer whatever the admin uploaded (persistent volume). Until the
  // first upload for a given slot, fall back to the file already shipped
  // in public/ — so existing logo/carousel images keep working exactly
  // as before, with nothing to re-upload on day one.
  let data;
  let source = filePath;
  try {
    data = fs.readFileSync(filePath);
  } catch {
    // The exact requested extension isn't in uploads — but if this slot
    // was customized with a DIFFERENT extension (e.g. the admin replaced
    // a .jpg photo with an .mp4 video, or uploaded a .jpg logo when
    // everything requests logo.png), don't silently fall back to the old
    // public/ placeholder — that would mask the real upload forever.
    // Only fall back when NOTHING for this slot exists in uploads at all.
    const dir = path.dirname(filePath);
    const wantedBase = path.basename(filePath, path.extname(filePath));
    let customizedElsewhere = false;
    try {
      customizedElsewhere = fs.readdirSync(dir).some(
        (f) => path.basename(f, path.extname(f)) === wantedBase
      );
    } catch {
      // dir doesn't exist yet — nothing uploaded for anything in it.
    }

    if (customizedElsewhere) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    const publicPath = path.join(process.cwd(), 'public', ...segments);
    try {
      data = fs.readFileSync(publicPath);
      source = publicPath;
    } catch {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }
  }

  const ext = path.extname(source).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300', // 5 min — short, so admin swaps show up fast
    },
  });
}
