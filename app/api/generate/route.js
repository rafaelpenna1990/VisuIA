import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/auth.js';
import { chargeCredits, refundCredits, logGeneration, createPendingGeneration } from '../../../lib/db.js';
import { estimatedChargeBRL, actualChargeBRL } from '../../../lib/pricing.js';
import {
  buildImageRequest,
  buildI2IRequest,
  buildVideoRequest,
  buildI2VRequest,
  buildLipSyncRequest,
  submitGeneration,
} from '../../../packages/studio/src/muapi.js';

const MUAPI_KEY = process.env.MUAPI_API_KEY;

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
  const kind = body.kind || 'image';

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

  let endpoint, payload;
  if (kind === 'i2i') {
    ({ endpoint, payload } = buildI2IRequest({
      model: body.model, prompt: body.prompt, images_list: body.images_list,
      image_url: body.image_url, aspect_ratio: body.aspect_ratio,
      resolution: body.resolution, quality: body.quality,
    }));
  } else if (kind === 'video') {
    ({ endpoint, payload } = buildVideoRequest({
      model: body.model, prompt: body.prompt, aspect_ratio: body.aspect_ratio,
      duration: body.duration, resolution: body.resolution, quality: body.quality,
      mode: body.mode, image_url: body.image_url,
    }));
  } else if (kind === 'i2v') {
    ({ endpoint, payload } = buildI2VRequest({
      model: body.model, prompt: body.prompt, image_url: body.image_url,
      aspect_ratio: body.aspect_ratio, duration: body.duration,
      resolution: body.resolution, quality: body.quality, mode: body.mode, name: body.name,
    }));
  } else if (kind === 'lipsync') {
    ({ endpoint, payload } = buildLipSyncRequest({
      model: body.model, audio_url: body.audio_url, image_url: body.image_url,
      video_url: body.video_url, prompt: body.prompt, resolution: body.resolution, seed: body.seed,
    }));
  } else {
    ({ endpoint, payload } = buildImageRequest({
      model: body.model, prompt: body.prompt, aspect_ratio: body.aspect_ratio,
      resolution: body.resolution, quality: body.quality, image_url: body.image_url,
      strength: body.strength, seed: body.seed,
    }));
  }

  let result;
  try {
    result = await submitGeneration(endpoint, payload, MUAPI_KEY);
  } catch (err) {
    refundCredits(user.id, estimate, `estorno — geração falhou: ${err.message}`);
    logGeneration(user.id, body.model, kind, 0, 'failed', null);
    return NextResponse.json({ error: `Falha na geração: ${err.message}` }, { status: 502 });
  }

  if (result.done) {
    const realCharge = actualChargeBRL(result.raw, kind);
    refundCredits(user.id, estimate, 'estorno da pré-cobrança estimada');
    try {
      chargeCredits(user.id, realCharge, `${body.model} — cobrança real`);
    } catch {
      // Balance dropped below the real cost between steps — still deliver
      // the result the user already paid the estimate for.
    }
    logGeneration(user.id, body.model, kind, realCharge, 'completed', result.url);
    return NextResponse.json({ done: true, url: result.url, charged_brl: realCharge });
  }

  const jobId = createPendingGeneration(user.id, body.model, kind, result.requestId, estimate);
  return NextResponse.json({ done: false, job_id: jobId });
}