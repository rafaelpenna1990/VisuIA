// lib/videoModelCosts.js
//
// Per-model cost estimates (USD, for a ~5s clip) used ONLY for the
// pre-flight "can this person afford to even start" check in
// lib/pricing.js. The REAL charge after generation always comes from
// Muapi's actual reported cost — this table just avoids blocking cheap
// models (like Seedance Lite) behind a ceiling sized for expensive ones
// (like Veo 3 or Sora 2 Pro).
//
// Sourced from Muapi's own per-model pages plus third-party aggregator
// benchmarks (Sep 2026) — treat as a reasonable ceiling, not an exact
// quote. Any model not listed here falls back to the old flat estimate
// in pricing.js, so nothing is ever under-estimated for a model we
// haven't priced yet.
export const VIDEO_MODEL_COST_USD = {
  // ── Budget / fast tier (~$0.08–0.15) ──────────────────────────────────
  'seedance-lite-t2v': 0.10,
  'seedance-lite-i2v': 0.10,
  'seedance-lite-reference-video': 0.10,
  'wan2.1-text-to-video': 0.12,
  'wan2.1-image-to-video': 0.12,
  'wan2.1-reference-video': 0.12,
  'wan2.2-text-to-video': 0.12,
  'wan2.2-image-to-video': 0.12,
  'wan2.2-5b-fast-t2v': 0.08,
  'wan2.2-spicy-image-to-video': 0.12,
  'hunyuan-text-to-video': 0.15,
  'hunyuan-fast-text-to-video': 0.10,
  'hunyuan-image-to-video': 0.15,
  'wan2.5-text-to-video-fast': 0.15,
  'ltx-2-fast-text-to-video': 0.12,
  'ltx-2-fast-image-to-video': 0.12,
  'ovi-text-to-video': 0.15,
  'ovi-image-to-video': 0.15,

  // ── Mid / standard tier (~$0.20–0.40) ─────────────────────────────────
  'seedance-pro-t2v-fast': 0.22,
  'seedance-pro-i2v-fast': 0.22,
  'seedance-pro-t2v': 0.35,
  'seedance-pro-i2v': 0.35,
  'seedance-v1.5-pro-t2v': 0.35,
  'seedance-v1.5-pro-t2v-fast': 0.25,
  'seedance-v1.5-pro-i2v': 0.35,
  'seedance-v1.5-pro-i2v-fast': 0.25,
  'seedance-v2.0-t2v': 0.35,
  'seedance-v2.0-i2v': 0.35,
  'seedance-v2.0-extend': 0.35,
  'kling-v2.1-standard-i2v': 0.20,
  'kling-v2.5-turbo-std-i2v': 0.20,
  'kling-v2.5-turbo-pro-t2v': 0.31,
  'kling-v2.5-turbo-pro-i2v': 0.31,
  'kling-v2.6-pro-t2v': 0.35,
  'kling-v2.6-pro-i2v': 0.35,
  'kling-v2.1-pro-i2v': 0.35,
  'pixverse-v4.5-t2v': 0.30,
  'pixverse-v4.5-i2v': 0.30,
  'pixverse-v5-t2v': 0.30,
  'pixverse-v5-i2v': 0.30,
  'pixverse-v5.5-t2v': 0.30,
  'pixverse-v5.5-i2v': 0.30,
  'runway-text-to-video': 0.40,
  'runway-image-to-video': 0.40,
  'runway-act-two-i2v': 0.40,
  'vidu-v2.0-t2v': 0.25,
  'vidu-v2.0-i2v': 0.25,
  'vidu-q1-reference': 0.25,
  'vidu-q2-reference': 0.30,
  'vidu-q2-turbo-start-end-video': 0.30,
  'vidu-q2-pro-start-end-video': 0.35,
  'wan2.5-text-to-video': 0.25,
  'wan2.5-image-to-video': 0.25,
  'wan2.6-text-to-video': 0.22,
  'wan2.6-image-to-video': 0.22,
  'minimax-hailuo-02-standard-t2v': 0.30,
  'minimax-hailuo-02-standard-i2v': 0.30,
  'minimax-hailuo-2.3-standard-t2v': 0.30,
  'minimax-hailuo-2.3-standard-i2v': 0.30,
  'minimax-hailuo-2.3-fast': 0.20,
  'leonardoai-motion-2.0': 0.30,
  'higgsfield-dop-image-to-video': 0.30,
  'ltx-2-pro-text-to-video': 0.30,
  'ltx-2-pro-image-to-video': 0.30,
  'ltx-2-19b-text-to-video': 0.25,
  'ltx-2-19b-image-to-video': 0.25,
  'grok-imagine-text-to-video': 0.25,
  'grok-imagine-image-to-video': 0.25,

  // ── Flagship / premium tier (~$0.45–1.30) ─────────────────────────────
  'veo3-fast-text-to-video': 0.40,
  'veo3-fast-image-to-video': 0.40,
  'veo3-text-to-video': 0.90,
  'veo3-image-to-video': 0.90,
  'veo3.1-fast-text-to-video': 0.50,
  'veo3.1-fast-image-to-video': 0.50,
  'veo3.1-text-to-video': 1.00,
  'veo3.1-image-to-video': 1.00,
  'veo3.1-reference-to-video': 1.00,
  'openai-sora': 0.50,
  'openai-sora-2-text-to-video': 0.60,
  'openai-sora-2-image-to-video': 0.60,
  'openai-sora-2-pro-text-to-video': 1.20,
  'openai-sora-2-pro-image-to-video': 1.20,
  'kling-v2.1-master-t2v': 0.45,
  'kling-v2.1-master-i2v': 0.45,
  'kling-o1-text-to-video': 0.56,
  'kling-o1-image-to-video': 0.56,
  'kling-o1-reference-to-video': 0.56,
  'kling-o1-standard-image-to-video': 0.42,
  'kling-o1-standard-reference-to-video': 0.42,
  'kling-v3.0-pro-text-to-video': 0.70,
  'kling-v3.0-pro-image-to-video': 0.70,
  'kling-v3.0-standard-text-to-video': 0.45,
  'kling-v3.0-standard-image-to-video': 0.45,
  'kling-v2.6-pro-i2v-sound': 0.45,
  'minimax-hailuo-02-pro-t2v': 0.60,
  'minimax-hailuo-02-pro-i2v': 0.60,
  'minimax-hailuo-2.3-pro-t2v': 0.65,
  'minimax-hailuo-2.3-pro-i2v': 0.65,
};

export function getVideoModelCostUSD(modelId) {
  return VIDEO_MODEL_COST_USD[modelId];
}
