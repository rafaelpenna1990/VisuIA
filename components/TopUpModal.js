'use client';

import { useState } from 'react';

const PACKS = [
  { id: 'small', label: 'R$ 20' },
  { id: 'medium', label: 'R$ 50' },
  { id: 'large', label: 'R$ 120' },
];

export default function TopUpModal({ onClose }) {
  const [loadingPack, setLoadingPack] = useState(null);
  const [error, setError] = useState(null);

  const buy = async (pack) => {
    setError(null);
    setLoadingPack(pack);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento');
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.message);
      setLoadingPack(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-sm">
        <h2 className="text-white font-bold text-xl mb-2">Adicionar créditos</h2>
        <p className="text-white/50 text-sm mb-6">Pagamento seguro via Stripe.</p>

        <div className="flex flex-col gap-2 mb-4">
          {PACKS.map((p) => (
            <button
              key={p.id}
              onClick={() => buy(p.id)}
              disabled={loadingPack !== null}
              className="w-full py-3 rounded-lg bg-[#d9ff00] text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loadingPack === p.id ? 'Redirecionando…' : `Comprar ${p.label}`}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 text-sm transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
