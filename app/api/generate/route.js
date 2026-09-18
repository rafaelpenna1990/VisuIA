import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth.js';
import { chargeCredits, refundCredits, logGeneration } from '../../../lib/db.js';
import { estimatedChargeBRL, actualChargeBRL } from '../../../lib/pricing.js';
// Reused as-is from the original client — it's plain fetch-based JS, so it
// works unmodified on the server. The only thing that changes is WHERE the
// api key comes from: process.env instead of the browser's localStorage.
import { generateImage, generateI2I } from '../../../packages/studio/src/muapi.js';

const MUAPI_KEY = process.env.MUAPI_API_KEY;

// Today this route wires up text-to-image ("image") and image-to-image
// ("i2i" — editing with reference images). To add video, i2v or lip sync:
// import the matching function from muapi.js (generateVideo, generateI2V,
// processLipSync), add its kind to ESTIMATED_CEILING_USD in lib/pricing.js,
// and add a branch in the switch below — the credit-check / charge /
// logging logic is identical for every kind.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  if (!MUAPI_KEY) {
    return NextResponse.json(
      { error: 'MUAPI_API_KEY não configurada no servidor' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const kind = body.kind || 'image'; // 'image' | 'i2i'

  // 1) Pre-flight: block obviously-unaffordable requests before we spend anything.
  const estimate = estimatedChargeBRL(kind);
  try {
    chargeCredits(user.id, estimate, `pré-cobrança estimada — ${body.model}`);
  } catch (err) {
    if (err.code === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        { error: 'Créditos insuficientes para esta geração', required_brl: estimate },
        { status: 402 }
      );
    }
    throw err;
  }

  // 2) Call Muapi with the server's own key — the client never sees it.
  let result;
  try {
    if (kind === 'i2i') {
      result = await generateI2I(MUAPI_KEY, {
        model: body.model,
        prompt: body.prompt,
        images_list: body.images_list,
        image_url: body.image_url,
        aspect_ratio: body.aspect_ratio,
        resolution: body.resolution,
        quality: body.quality,
      });
    } else {
      result = await generateImage(MUAPI_KEY, {
        model: body.model,
        prompt: body.prompt,
        aspect_ratio: body.aspect_ratio,
        resolution: body.resolution,
        quality: body.quality,
        image_url: body.image_url,
        strength: body.strength,
        seed: body.seed,
      });
    }
  } catch (err) {
    // Generation failed — refund the pre-charge in full, nothing to true-up.
    refundCredits(user.id, estimate, `estorno — geração falhou: ${err.message}`);
    logGeneration(user.id, body.model, kind, 0, 'failed', null);
    return NextResponse.json({ error: `Falha na geração: ${err.message}` }, { status: 502 });
  }

  // 3) True-up: refund the estimate, charge the REAL cost Muapi reported.
  const realCharge = actualChargeBRL(result, kind);
  refundCredits(user.id, estimate, 'estorno da pré-cobrança estimada');
  try {
    chargeCredits(user.id, realCharge, `${body.model} — cobrança real`);
  } catch {
    // Balance dropped below the real cost between steps (e.g. concurrent
    // request drained it) — still deliver the result the user already
    // paid the estimate for, but log the shortfall for reconciliation.
  }
  logGeneration(user.id, body.model, kind, realCharge, 'completed', result.url);

  return NextResponse.json({
    url: result.url,
    charged_brl: realCharge,
  });
}
