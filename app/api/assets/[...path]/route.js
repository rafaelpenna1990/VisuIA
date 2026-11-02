import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

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

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// Descobre qual arquivo servir: primeiro o que o admin enviou (volume
// persistente); enquanto nada foi enviado para aquele espaço, vale o
// arquivo que já vem em public/. Devolve null se não existe.
function resolveSource(segments, filePath) {
  if (isFile(filePath)) return filePath;

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
  if (customizedElsewhere) return null;

  const publicPath = path.join(process.cwd(), 'public', ...segments);
  return isFile(publicPath) ? publicPath : null;
}

// Lê só o pedaço pedido do disco (em vez de carregar o arquivo inteiro na
// memória a cada pedido), o que deixa os vídeos começarem bem mais rápido.
function streamBody(source, start, end) {
  return Readable.toWeb(fs.createReadStream(source, { start, end }));
}

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

  const source = resolveSource(segments, filePath);
  if (!source) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
  }

  const total = fs.statSync(source).size;
  const ext = path.extname(source).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  // Os endereços com ?v=<versão> mudam sozinhos quando o admin troca o
  // arquivo, então podem ficar guardados no navegador por muito tempo (a
  // segunda visita já abre na hora). Sem versão, o cache é curto.
  const versioned = new URL(request.url).searchParams.has('v');
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    'Accept-Ranges': 'bytes',
  };

  // Navegadores pedem vídeo em pedaços (Range). Sem responder 206, o vídeo
  // pode não tocar (Safari/iPhone) ou demorar a começar.
  const range = request.headers.get('range');
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match && (match[1] || match[2])) {
    let start;
    let end;
    if (match[1] === '') {
      start = Math.max(total - Number(match[2]), 0);
      end = total - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
    }
    if (start >= total || start > end) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    }
    return new NextResponse(streamBody(source, start, end), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  if (total === 0) return new NextResponse(null, { headers: { ...headers, 'Content-Length': '0' } });
  return new NextResponse(streamBody(source, 0, total - 1), {
    headers: { ...headers, 'Content-Length': String(total) },
  });
}
