'use client';

import { useState, useEffect, useMemo } from 'react';

const STATUSES = [
  { id: 'all', label: 'Todos' },
  { id: 'trialing', label: 'Em período grátis', color: 'text-sky-300' },
  { id: 'active', label: 'Ativos', color: 'text-green-400' },
  { id: 'canceling', label: 'Cancelando', color: 'text-yellow-300' },
  { id: 'canceled', label: 'Cancelados', color: 'text-red-400' },
];

const STATUS_LABEL = {
  trialing: 'Período grátis',
  active: 'Ativo',
  canceling: 'Cancelando (vale até o fim do período)',
  canceled: 'Cancelado',
};

const PROVIDER_LABEL = { pagarme: 'Pagar.me', stripe: 'Stripe' };

// created_at do SQLite vem em UTC como "YYYY-MM-DD HH:MM:SS".
function parseDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(d) {
  return d ? d.toLocaleDateString('pt-BR') : '—';
}

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function AdminSubscribersTab({ adminKey }) {
  const [rows, setRows] = useState([]);
  const [trialDays, setTrialDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('all');
  const [provider, setProvider] = useState('all');
  const [query, setQuery] = useState('');

  const load = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/subscribers?key=${encodeURIComponent(adminKey)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Erro ao carregar');
        setRows(data.subscribers || []);
        if (data.trialDays) setTrialDays(data.trialDays);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { all: rows.length, trialing: 0, active: 0, canceling: 0, canceled: 0 };
    rows.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
    return c;
  }, [rows]);

  const plans = useMemo(() => [...new Set(rows.map((r) => r.plan))], [rows]);

  const filtered = rows.filter((r) =>
    (status === 'all' || r.status === status) &&
    (plan === 'all' || r.plan === plan) &&
    (provider === 'all' || r.provider === provider) &&
    (!query || r.email.toLowerCase().includes(query.toLowerCase()))
  );

  const select = 'px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50';

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatus(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              status === s.id ? 'bg-primary text-black border-primary' : 'bg-card-bg text-white/60 hover:text-white border-white/10'
            }`}
          >
            {s.label} <span className="opacity-70">({counts[s.id] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por e-mail…"
          className={`${select} flex-1 min-w-[200px]`}
        />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={select}>
          <option value="all">Todos os planos</option>
          {plans.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className={select}>
          <option value="all">Todos os meios de cobrança</option>
          <option value="pagarme">Pagar.me</option>
          <option value="stripe">Stripe</option>
        </select>
        <button onClick={load} className="px-4 py-2 rounded-lg bg-white/10 text-white font-semibold text-sm hover:bg-white/20">
          Atualizar
        </button>
      </div>

      {error && <p className="text-primary text-sm mb-3">{error}</p>}
      {loading && <p className="text-white/40 text-sm mb-3">Carregando…</p>}
      {!loading && (
        <p className="text-white/30 text-xs mb-3">
          {filtered.length} assinatura{filtered.length === 1 ? '' : 's'} nesta lista. A data de cobrança do período grátis é uma previsão
          (início + {trialDays} dias); a data exata está na Pagar.me.
        </p>
      )}

      <div className="overflow-x-auto bg-card-bg border border-white/10 rounded-2xl">
        <table className="w-full text-sm text-left">
          <thead className="text-white/40 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3">Começou em</th>
              <th className="px-4 py-3">Primeira cobrança</th>
              <th className="px-4 py-3">Cobrança</th>
              <th className="px-4 py-3 text-right">Saldo (VT)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const started = parseDate(r.created_at);
              const firstCharge = started ? new Date(started.getTime() + trialDays * 86400000) : null;
              const left = r.status === 'trialing' ? daysUntil(firstCharge) : null;
              const color = STATUSES.find((s) => s.id === r.status)?.color || 'text-white';
              return (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white">{r.email}</td>
                  <td className="px-4 py-3 text-white/70">{r.plan}</td>
                  <td className={`px-4 py-3 font-semibold ${color}`}>{STATUS_LABEL[r.status] || r.status}</td>
                  <td className="px-4 py-3 text-white/60">{fmtDate(started)}</td>
                  <td className="px-4 py-3 text-white/60">
                    {r.status === 'trialing'
                      ? `${fmtDate(firstCharge)}${left !== null ? (left > 0 ? ` (em ${left} dia${left === 1 ? '' : 's'})` : ' (hoje ou já passou)') : ''}`
                      : r.first_charge_done ? 'Já cobrada' : '—'}
                  </td>
                  <td className="px-4 py-3 text-white/60">{PROVIDER_LABEL[r.provider] || r.provider}</td>
                  <td className="px-4 py-3 text-right text-white/70">{Math.round(Number(r.credits_balance) * 100).toLocaleString('pt-BR')}</td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-white/30">Nenhuma assinatura com esses filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
