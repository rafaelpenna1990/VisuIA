import { NextResponse } from 'next/server';
import { getSetting } from '../../../lib/db.js';

// Public — the homepage hero title/subtitle, editable in /admin.
export async function GET() {
  return NextResponse.json({
    title: getSetting('hero_title', 'Sua ideia vira imagem, vídeo ou cena de cinema **em segundos.**'),
    subtitle: getSetting('hero_subtitle', 'Escolha abaixo o que você quer criar e já comece a mexer nas opções — sem precisar de software caro.'),
  });
}
