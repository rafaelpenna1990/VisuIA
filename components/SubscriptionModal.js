'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '../lib/i18n/useTranslation.js';

// Shown right after a first-time signup (see page.js) — same popup
// pattern as AuthModal. The person either starts a plan's 7-day free
// trial (getting the flat bonus immediately) or buys a token package
// outright with onBuyWithoutSubscription — there's no free "skip".
//
// Plans and the trial bonus are fetched from /api/plans (DB-backed,
// editable in /admin) instead of being hardcoded here.
export default function SubscriptionModal({ onClose, onBuyWithoutSubscription }) {
  const [plans, setPlans] = useState([]);
  const [trialBonusTokens, setTrialBonusTokens] = useState(500);
  const [trialEntryFeeCents, setTrialEntryFeeCents] = useState(0);
  const [subscribing, setSubscribing] = useState(null);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans || []);
        if (data.trialBonusTokens) setTrialBonusTokens(data.trialBonusTokens);
        setTrialEntryFeeCents(data.trialEntryFeeCents || 0);
      })
      .catch(() => {});
  }, []);

  const hasEntryFee = trialEntryFeeCents > 0;
  const entryFeeLabel = `R$ ${(trialEntryFeeCents / 100).toFixed(2).replace('.', ',')}`;

  const handleSubscribe = async (planId) => {
    setError(null);
    setSubscribing(planId);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('subscription.genericError'));
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.message);
      setSubscribing(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-[#0F1119] border border-primary/30 rounded-2xl p-6 sm:p-8 w-full max-w-2xl relative shadow-glow">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
          aria-label={t('auth.close')}
        >
          ✕
        </button>

        <span className="inline-block bg-primary text-black text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-3">
          {t('subscription.welcomeOffer')}
        </span>
        <h1 className="text-white font-black text-2xl mb-1">
          {t('subscription.titlePrefix')} {trialBonusTokens.toLocaleString('pt-BR')} {t('subscription.titleSuffix')}
        </h1>
        <p className="text-white/50 text-sm mb-6">
          {hasEntryFee ? (
            <>
              {t('subscription.descEntryFeePrefix')} <span className="text-primary font-semibold">7 {t('subscription.descEntryFeeMiddle')} {entryFeeLabel}</span> —
              {' '}{trialBonusTokens.toLocaleString('pt-BR')} {t('subscription.descEntryFeeSuffix')}
            </>
          ) : (
            <>
              {t('subscription.descFreePrefix')} <span className="text-primary font-semibold">{t('subscription.descFreeDays')}</span> —
              {' '}{trialBonusTokens.toLocaleString('pt-BR')} {t('subscription.descFreeSuffix')}
            </>
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-card-bg border border-white/10 rounded-2xl p-5 flex flex-col relative">
              <span className="text-primary text-[10px] font-bold uppercase tracking-wider mb-2">
                + {trialBonusTokens.toLocaleString('pt-BR')} {t('subscription.freeNowBadge')}
              </span>
              <p className="text-white font-black text-base mb-1">{plan.name}</p>
              {plan.promo_amount_cents != null && plan.promo_amount_cents > plan.amount_cents && (
                <p className="text-white/40 text-xs line-through mb-0.5">
                  R$ {(plan.promo_amount_cents / 100).toFixed(0)}/mês
                </p>
              )}
              <p className="text-primary font-bold text-xl mb-1">
                R$ {(plan.amount_cents / 100).toFixed(0)}
                <span className="text-white/40 text-xs font-normal">{t('subscription.perMonthAfterTrial')}</span>
              </p>
              <p className="text-white/50 text-xs mb-5">{plan.tokens.toLocaleString('pt-BR')} {t('subscription.tokensPerMonth')}</p>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscribing !== null}
                className="mt-auto w-full py-2 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {subscribing === plan.id ? t('subscription.redirecting') : hasEntryFee ? `${t('subscription.startFor')} ${entryFeeLabel}` : t('subscription.startFree')}
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          type="button"
          onClick={onBuyWithoutSubscription}
          className="w-full text-white/40 hover:text-white text-sm transition-colors"
        >
          {t('subscription.preferBuyTokens')}
        </button>
      </div>
    </div>
  );
}
