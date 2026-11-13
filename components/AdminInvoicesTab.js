'use client';

import { useState, useEffect, useCallback } from 'react';

const FILTERS = [
  { id: 'pending', label: 'A emitir' },
  { id: 'issued', label: 'Emitidas' },
  { id: 'all', label: 'Todas' },
];

// paid_at pode vir como ISO da Pagar.me ou "YYYY-MM-DD HH:MM:SS" (UTC).
function fmtDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  const d = new Date(/T|Z/.test(text) ? text : text.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? text : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtMoney(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDocument(doc) {
  const d = String(doc || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d || '—';
}

// Bloco de texto para colar no Conta Azul.
function copyText(r) {
  return [
    `Nome: ${r.customer_name || ''}`,
    `CPF/CNPJ: ${fmtDocument(r.customer_document)}`,
    `E-mail: ${r.customer_email || ''}`,
    `Valor: ${fmtMoney(r.amount_cents)}`,
    `Serviço: ${r.description || ''}`,
  ].join('\n');
}

export default function AdminInvoicesTab({ adminKey, onCountsChange }) {
  const [filter, setFilter] = useState('pending');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, issued: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [numbers, setNumbers] = useState({});
  const [busy, setBusy] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const keyParam = encodeURIComponent(adminKey);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/invoices?key=${keyParam}&status=${filter}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Erro ao carregar');
        setRows(data.invoices || []);
        setCounts(data.counts || { pending: 0, issued: 0 });
        if (onCountsChange) onCountsChange(data.counts?.pending || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [keyParam, filter, onCountsChange]);

  useEffect(load, [load]);

  const mark = async (row, issued) => {
    setBusy(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices?key=${keyParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          issued,
          invoice_number: issued ? (numbers[row.id] ?? row.invoice_number ?? '') : '',
          note: row.note || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const copy = async (row) => {
    try {
      await navigator.clipboard.writeText(copyText(row));
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError('Não consegui copiar. Selecione o texto manualmente.');
    }
  };

  const backfill = async () => {
    setBusy('backfill');
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/invoices/backfill?key=${keyParam}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar');
      setMessage(`Importação concluída: ${data.added} novo(s) pagamento(s) na fila (${data.skipped} já estavam ou não eram do site).`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const select = 'px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50';

  return (
    <div className="max-w-6xl">
      <p className="text-white/40 text-xs mb-4 max-w-3xl">
        Cada pagamento aprovado na Pagar.me entra aqui com os dados do cliente. Emita a nota de serviço no Conta Azul
        (use o botão <b>Copiar dados</b>), anote o número da nota e marque como emitida. Pagamentos de antes desta tela
        existir entram pelo botão <b>Importar pagamentos anteriores</b>.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f.id ? 'bg-primary text-black border-primary' : 'bg-card-bg text-white/60 hover:text-white border-white/10'
            }`}
          >
            {f.label}
            {f.id !== 'all' && <span className="opacity-70"> ({counts[f.id] ?? 0})</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={load} className={`${select} font-semibold hover:bg-white/10`}>Atualizar</button>
        <a
          href={`/api/admin/invoices?key=${keyParam}&status=${filter}&format=csv`}
          className={`${select} font-semibold hover:bg-white/10`}
        >
          Baixar planilha (CSV)
        </a>
        <button
          onClick={backfill}
          disabled={busy === 'backfill'}
          className={`${select} font-semibold hover:bg-white/10 disabled:opacity-50`}
        >
          {busy === 'backfill' ? 'Importando…' : 'Importar pagamentos anteriores'}
        </button>
      </div>

      {error && <p className="text-primary text-sm mb-3">{error}</p>}
      {message && <p className="text-green-400 text-sm mb-3">{message}</p>}
      {loading && <p className="text-white/40 text-sm mb-3">Carregando…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-white/40 text-sm mb-3">
          {filter === 'pending' ? 'Nenhuma nota a emitir. 🎉' : 'Nada por aqui ainda.'}
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto bg-card-bg border border-white/10 rounded-2xl">
          <table className="w-full text-sm text-left">
            <thead className="text-white/40 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Pago em</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">CPF/CNPJ</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Nº da nota</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 align-top">
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">{fmtDateTime(r.paid_at)}</td>
                  <td className="px-4 py-3 text-white">
                    <div>{r.customer_name || '—'}</div>
                    <div className="text-white/40 text-xs">{r.customer_email || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">{fmtDocument(r.customer_document)}</td>
                  <td className="px-4 py-3 text-white text-right whitespace-nowrap">{fmtMoney(r.amount_cents)}</td>
                  <td className="px-4 py-3 text-white/60 text-xs min-w-[200px]">{r.description || '—'}</td>
                  <td className="px-4 py-3">
                    {r.issued ? (
                      <span className="text-green-400 text-xs">{r.invoice_number || 'emitida'}</span>
                    ) : (
                      <input
                        value={numbers[r.id] ?? ''}
                        onChange={(e) => setNumbers({ ...numbers, [r.id]: e.target.value })}
                        placeholder="opcional"
                        className={`${select} w-28`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => copy(r)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 mr-2"
                    >
                      {copiedId === r.id ? 'Copiado ✓' : 'Copiar dados'}
                    </button>
                    {r.issued ? (
                      <button
                        onClick={() => mark(r, false)}
                        disabled={busy === r.id}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
                      >
                        Desfazer
                      </button>
                    ) : (
                      <button
                        onClick={() => mark(r, true)}
                        disabled={busy === r.id}
                        className="px-3 py-1.5 rounded-lg bg-primary text-black text-xs font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        Marcar emitida
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
