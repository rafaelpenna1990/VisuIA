// lib/plans.js
//
// The 3 subscription tiers. amount_cents is what Stripe charges monthly;
// tokens is what the user's balance gets topped up by each successful
// billing cycle (converted to reais internally: tokens / 100).
// Higher tiers give a bigger bonus (more tokens per real paid) to make
// upgrading clearly worth it.

export const PLANS = {
  basico: {
    id: 'basico',
    name: 'Básico',
    amount_cents: 2900,
    tokens: 2900,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    amount_cents: 7900,
    tokens: 8700,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    amount_cents: 19900,
    tokens: 23880,
  },
};

export function planTokensToReais(plan) {
  return PLANS[plan].tokens / 100;
}

export const TRIAL_BONUS_TOKENS = 500;

export function trialBonusReais() {
  return TRIAL_BONUS_TOKENS / 100;
}