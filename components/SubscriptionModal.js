'use client';

import { useState } from 'react';
import { PLANS, TRIAL_BONUS_TOKENS } from '../lib/plans.js';

export default function SubscriptionModal({ onClose, onBuyWithoutSubscription }) {
  const [subscribing, setSubscribing] = useState(null);
  const [error, setError] = useState(null);

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
      if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar a assinatura');
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.message);
      setSubscribing(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-[#150E1C] border border-primary/30 rounded-2xl p-6 sm:p-8 w-full max-w-2xl relative shadow-glow">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          ✕
        </button>

        <span className="inline-block bg-primary text-black text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-3">
          Oferta de boas-vindas
        </span>
        <h1 className="text-white font-black text-2xl mb-1">
          Ganhe {TRIAL_BONUS_TOKENS.toLocaleString('pt-BR')} VisuTokens de graça
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Escolha um plano agora e comece com <span className="text-primary font-semibold">7 dias grátis</span> —
          os {TRIAL_BONUS_TOKENS.toLocaleString('pt-BR')} VisuTokens caem na sua conta na hora, sem cobrar nada do cartão até o 7º dia.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className="bg-card-bg border border-white/10 rounded-2xl p-5 flex flex-col relative">
              <span className="text-primary text-[10px] font-bold uppercase tracking-wider mb-2">
                + {TRIAL_BONUS_TOKENS.toLocaleString('pt-BR')} grátis agora
              </span>
              <p className="text-white font-black text-base mb-1">{plan.name}</p>
              <p className="text-primary font-bold text-xl mb-1">
                R$ {(plan.amount_cents / 100).toFixed(0)}
                <span className="text-white/40 text-xs font-normal">/mês depois do 7º dia</span>
              </p>
              <p className="text-white/50 text-xs mb-5">{plan.tokens.toLocaleString('pt-BR')} VisuTokens/mês</p>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscribing !== null}
                className="mt-auto w-full py-2 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {subscribing === plan.id ? 'Redirecionando…' : 'Começar grátis'}
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
          Prefiro comprar tokens sem assinatura
        </button>
      </div>
    </div>
  );
}