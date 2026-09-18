import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth.js';
import { chargeCredits, refundCredits, logGeneration } from '../../../lib/db.js';
import { estimatedChargeBRL, actualChargeBRL } from '../../../lib/pricing.js';
// Reused as-is from the original client — it's plain fetch-based JS, so it
// works unmodified on the server. The only thing that changes is WHERE the
// api key comes from: process.env instead of the browser's localStorage.
import {
  generateImage,
  generateI2I,
  generateVideo,
  generateI2V,
  processLipSync,
} from '../../../packages/studio/src/muapi.js';

const MUAPI_KEY = process.env.MUAPI_API_KEY;

// Handles every generation kind the studio offers: 'image', 'i2i', 'video',
// 'i2v', 'lipsync'. The credit-check / charge / logging logic is identical
// for all of them — only which Muapi function gets called differs.
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
  const kind = body.kind || 'image'; // 'image' | 'i2i' | 'video' | 'i2v' | 'lipsync'

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
    } else if (kind === 'video') {
      result = await generateVideo(MUAPI_KEY, {
        model: body.model,
        prompt: body.prompt,
        aspect_ratio: body.aspect_ratio,
        duration: body.duration,
        resolution: body.resolution,
        quality: body.quality,
        mode: body.mode,
        image_url: body.image_url,
      });
    } else if (kind === 'i2v') {
      result = await generateI2V(MUAPI_KEY, {
        model: body.model,
        prompt: body.prompt,
        image_url: body.image_url,
        aspect_ratio: body.aspect_ratio,
        duration: body.duration,
        resolution: body.resolution,
        quality: body.quality,
        mode: body.mode,
      });
    } else if (kind === 'lipsync') {
      result = await processLipSync(MUAPI_KEY, {
        model: body.model,
        audio_url: body.audio_url,
        image_url: body.image_url,
        video_url: body.video_url,
        prompt: body.prompt,
        resolution: body.resolution,
        seed: body.seed,
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