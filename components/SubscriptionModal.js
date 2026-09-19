'use client';

import { useState } from 'react';
import { PLANS } from '../lib/plans.js';

export default function SubscriptionModal({ onClose, onSkip }) {
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
      <div className="bg-[#150E1C] border border-white/10 rounded-2xl p-6 sm:p-8 w-full max-w-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          ✕
        </button>

        <h1 className="text-white font-black text-xl mb-1">Escolha um plano</h1>
        <p className="text-white/50 text-sm mb-6">
          Assine e receba VisuTokens todo mês, com bônus quanto maior o plano — ou pule e compre avulso quando quiser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className="bg-card-bg border border-white/10 rounded-2xl p-5 flex flex-col">
              <p className="text-white font-black text-base mb-1">{plan.name}</p>
              <p className="text-primary font-bold text-xl mb-1">
                R$ {(plan.amount_cents / 100).toFixed(0)}
                <span className="text-white/40 text-xs font-normal">/mês</span>
              </p>
              <p className="text-white/50 text-xs mb-5">{plan.tokens.toLocaleString('pt-BR')} VisuTokens/mês</p>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscribing !== null}
                className="mt-auto w-full py-2 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {subscribing === plan.id ? 'Redirecionando…' : 'Assinar'}
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          type="button"
          onClick={onSkip}
          className="w-full text-white/40 hover:text-white text-sm transition-colors"
        >
          Pular por agora, quero só comprar avulso
        </button>
      </div>
    </div>
  );
}