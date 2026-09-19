// lib/tokens.js
//
// VisuTokens is the display currency shown to users — 100 tokens = R$1
// (i.e. 1000 tokens per R$10, per the founder's chosen exchange rate).
// The database still stores everything in real R$ underneath (that's what
// Stripe actually charges); this is purely a presentation-layer rename to
// make balances feel more substantial, the same trick game/casino credit
// systems use.

export function reaisToTokens(reaisAmount) {
  return Math.round((reaisAmount || 0) * 100);
}

export function formatTokens(reaisAmount) {
  const tokens = reaisToTokens(reaisAmount);
  return `${tokens.toLocaleString('pt-BR')} VisuTokens`;
}

// Shorter form for tight spaces (header badge) — same number, "VT" instead
// of the full word.
export function formatTokensCompact(reaisAmount) {
  const tokens = reaisToTokens(reaisAmount);
  return `${tokens.toLocaleString('pt-BR')} VT`;
}