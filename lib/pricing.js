// lib/pricing.js
//
// Muapi tells you the EXACT cost of a generation in its response
// (cost.amount_usd) — so instead of guessing per-model prices, we:
//   1) do a conservative pre-flight check with an estimated ceiling,
//      so the user can't start a generation they clearly can't afford;
//   2) charge the REAL cost (converted to R$, with your markup) after
//      the generation succeeds.
//
// The exchange rate and markup are admin-editable (see /admin) and read
// fresh from the database on every call, so a change takes effect
// immediately — no redeploy needed.
//
// "Credits" in this codebase are just R$, stored as a float. Good enough
// to validate the idea; move to integer centavos if you scale this up
// (floats + money is a classic source of rounding bugs).

import { getSetting } from './db.js';

function getFxRate() {
  return Number(getSetting('usd_to_brl', process.env.USD_TO_BRL || '5.30'));
}

function getMarkup() {
  return Number(getSetting('price_markup', process.env.PRICE_MARKUP || '7'));
}

// Conservative ceiling per generation type, used ONLY to block a request
// before it runs if the user obviously doesn't have enough balance.
// Based on Muapi's published range (Nano Banana Pro image ~US$0.02,
// flagship video like Veo/Sora ~US$0.30-0.70). Tune these as you add models.
export const ESTIMATED_CEILING_USD = {
  image: 0.10,
  i2i: 0.10,
  video: 0.80,
  i2v: 0.80,
  lipsync: 0.50,
};

export function usdToBRLCharge(usd) {
  return usd * getFxRate() * getMarkup();
}

export function estimatedChargeBRL(kind) {
  const ceiling = ESTIMATED_CEILING_USD[kind] ?? 0.10;
  return usdToBRLCharge(ceiling);
}

// Pulls the real cost Muapi charged from its response shape:
// { cost: { amount_usd: 0.0042 }, ... }. Falls back to the estimated
// ceiling if Muapi didn't return a cost field (shouldn't happen, but
// better to overcharge slightly than give away free generations).
export function actualChargeBRL(muapiResult, kind) {
  const usd = muapiResult?.cost?.amount_usd;
  if (typeof usd === 'number' && usd >= 0) return usdToBRLCharge(usd);
  return estimatedChargeBRL(kind);
}
