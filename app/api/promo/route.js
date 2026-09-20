import { NextResponse } from 'next/server';
import { getSetting } from '../../../lib/db.js';

// Public — the promo banner shown on the homepage, /criar/*, /modelos/*
// and /como-funciona reads its text from here, editable in /admin.
export async function GET() {
  return NextResponse.json({
    text: getSetting('promo_text', '🎁 7 dias grátis + 500 VisuTokens de bônus só por assinar'),
  });
}
