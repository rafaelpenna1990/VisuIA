import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth.js';

const MUAPI_KEY = process.env.MUAPI_API_KEY;

// Uploads are free on Muapi, but still gated behind login so anonymous
// visitors can't use your server as a free file host.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!MUAPI_KEY) return NextResponse.json({ error: 'MUAPI_API_KEY não configurada' }, { status: 500 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });

  const upstream = new FormData();
  upstream.append('file', file);

  const response = await fetch('https://api.muapi.ai/api/v1/upload_file', {
    method: 'POST',
    headers: { 'x-api-key': MUAPI_KEY },
    body: upstream,
  });

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json({ error: `Upload falhou: ${errText.slice(0, 200)}` }, { status: 502 });
  }

  const data = await response.json();
  const fileUrl = data.url || data.file_url || data.data?.url;
  return NextResponse.json({ url: fileUrl });
}
