'use client';

import { useState, useEffect, useRef } from 'react';


// Máscaras dos campos (só dígitos entram; a formatação aparece sozinha).
const digitsOnly = (v) => String(v || '').replace(/\D/g, '');

function maskCpf(v) {
  const d = digitsOnly(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function maskPhone(v) {
  const d = digitsOnly(v).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCardNumber(v) {
  return digitsOnly(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function maskExpiry(v) {
  const d = digitsOnly(v).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

// Bandeira do cartão a partir dos primeiros dígitos (só para mostrar ao cliente).
function cardBrand(v) {
  const d = digitsOnly(v);
  if (d.length < 2) return null;
  const n2 = Number(d.slice(0, 2));
  const n4 = Number(d.slice(0, 4));
  const n6 = Number(d.slice(0, 6));
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(d)) return 'Elo';
  if (d.startsWith('606282') || d.startsWith('3841')) return 'Hipercard';
  if (d[0] === '4') return 'Visa';
  if ((n2 >= 51 && n2 <= 55) || (n4 >= 2221 && n4 <= 2720)) return 'Mastercard';
  if (n2 === 34 || n2 === 37) return 'Amex';
  if (n2 === 36 || n2 === 38 || (n6 >= 300000 && n6 <= 305999)) return 'Diners';
  return null;
}

const formatDate = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Quadro "Entenda as cobranças": mostra o que será cobrado e quando.
function ChargeSummary({ rows }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <p className="text-white/80 text-xs font-bold mb-2">Entenda as cobranças</p>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${r.now ? 'bg-primary' : 'bg-white/25'}`} />
            <div className="flex-1">
              <p className={`text-xs font-semibold ${r.now ? 'text-white' : 'text-white/70'}`}>{r.title}</p>
              <p className="text-white/40 text-[11px]">{r.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Formulário de pagamento do VisuIA (cartão e Pix) usando a Pagar.me.
// O número do cartão vai direto do navegador para a Pagar.me (tokenização com
// a chave pública) — nosso servidor só recebe o token.
//
// config vem da API: { kind: 'subscription'|'pack', publicKey, plan|pack, trialDays }
export default function PagarmeCardModal({ config, onClose, onSuccess }) {
  const isChange = config.kind === 'card-change';
  const isSub = config.kind === 'subscription';
  const amountCents = isSub || isChange ? config.plan.amount_cents : config.pack.amount_cents;
  const title = isChange ? 'Trocar cartão' : isSub ? `Plano ${config.plan.name}` : config.pack.label;
  const money = `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`;

  const chargeRows = (() => {
    if (isChange) {
      return config.payNow
        ? [
            { now: true, title: `Hoje · ${money}`, note: 'Cobrança da assinatura no cartão novo; os VisuTokens do plano entram em seguida.' },
            { title: `Todo mês · ${money}`, note: 'As próximas cobranças seguem no cartão novo.' },
          ]
        : null;
    }
    if (!isSub) return null;
    if (config.trialDays > 0) {
      const first = new Date(Date.now() + config.trialDays * 86400000);
      return [
        { now: true, title: 'Hoje · R$ 0,00', note: `Nada é cobrado agora. Você tem ${config.trialDays} dias grátis.` },
        { title: `${formatDate(first)} · ${money}`, note: 'Primeira cobrança, ao fim do período grátis. Cancele antes disso e não paga nada.' },
        { title: `Depois · ${money} todo mês`, note: 'Cancele quando quiser, direto na sua conta.' },
      ];
    }
    return [
      { now: true, title: `Hoje · ${money}`, note: 'Cobrança da assinatura ao finalizar.' },
      { title: `Todo mês · ${money}`, note: 'Cancele quando quiser, direto na sua conta.' },
    ];
  })();

  const [method, setMethod] = useState('card');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [number, setNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [pix, setPix] = useState(null);
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);
  const pollRef = useRef(null);

  const finish = () => {
    setDone(true);
    setTimeout(() => {
      if (onSuccess) onSuccess();
      else window.location.reload();
    }, 1800);
  };

  useEffect(() => {
    if (!pix) return undefined;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/pagarme/charge-status?id=${encodeURIComponent(pix.chargeId)}`, { credentials: 'include' });
        const data = await res.json();
        if (data.paid) {
          clearInterval(pollRef.current);
          finish();
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 4000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix]);

  const tokenizeCard = async () => {
    const digits = number.replace(/\D/g, '');
    const m = expiry.match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);
    if (digits.length < 13) throw new Error('Número do cartão inválido');
    if (!holder.trim()) throw new Error('Informe o nome impresso no cartão');
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) throw new Error('Validade inválida (use MM/AA)');
    if (!/^\d{3,4}$/.test(cvv)) throw new Error('CVV inválido');
    const res = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(config.publicKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        type: 'card',
        card: {
          number: digits,
          holder_name: holder.trim(),
          exp_month: Number(m[1]),
          exp_year: m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]),
          cvv,
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      const msg = data?.errors ? Object.values(data.errors).flat().join('; ') : data?.message;
      throw new Error(msg || `Não foi possível validar o cartão (${res.status})`);
    }
    return data.id;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (digitsOnly(cpf).length !== 11) throw new Error('CPF incompleto');
      if (digitsOnly(phone).length < 10) throw new Error('Celular incompleto — informe com DDD');
      const buyer = { name, cpf, phone };
      let body;
      let url;
      if (isChange) {
        url = '/api/billing/pagarme/change-card';
        body = { ...buyer, token: await tokenizeCard() };
      } else if (isSub) {
        url = '/api/billing/pagarme/subscribe';
        body = { ...buyer, plan: config.plan.id, token: await tokenizeCard() };
      } else {
        url = '/api/billing/pagarme/pack';
        body = { ...buyer, pack: config.pack.id, method };
        if (method === 'card') body.token = await tokenizeCard();
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao processar o pagamento');
      if (data.pix) setPix(data.pix);
      else finish();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const input = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-primary';

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] px-4 py-8 overflow-y-auto">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 w-full max-w-md relative">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white" aria-label="Fechar">✕</button>
        <h2 className="text-white font-black text-lg mb-1">{title}</h2>
        <p className="text-white/50 text-sm mb-4">
          {isChange
            ? config.payNow
              ? `A última cobrança não foi aprovada. Vamos cobrar ${money} agora no cartão novo e liberar seus VisuTokens do plano.`
              : 'O cartão novo passa a valer para as próximas cobranças. Nada é cobrado agora.'
            : isSub
            ? config.trialDays > 0
              ? `${config.trialDays} dias grátis, depois ${money}/mês. Cancele quando quiser.`
              : `${money}/mês. Cancele quando quiser.`
            : `Pagamento único de ${money}.`}
        </p>

        {done ? (
          <p className="text-green-400 font-semibold text-sm py-6 text-center">
            {isChange && !config.payNow ? 'Cartão atualizado! Atualizando…' : 'Pagamento confirmado! Atualizando…'}
          </p>
        ) : pix ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-white/70 text-sm text-center">Escaneie o QR Code ou copie o código Pix. Assim que pagar, seus tokens entram automaticamente.</p>
            {pix.qr_code_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pix.qr_code_url} alt="QR Code Pix" className="w-48 h-48 bg-white rounded-lg p-2" />
            )}
            <textarea readOnly value={pix.qr_code} className={`${input} h-20 text-xs`} />
            <button type="button" onClick={copyPix} className="w-full py-2 rounded-lg bg-primary text-black font-bold text-sm">
              {copied ? 'Copiado!' : 'Copiar código Pix'}
            </button>
            <p className="text-white/40 text-xs">Aguardando pagamento…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            {!isSub && !isChange && (
              <div className="grid grid-cols-2 gap-2">
                {[['card', 'Cartão'], ['pix', 'Pix']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMethod(id)}
                    className={`py-2 rounded-lg text-sm font-semibold border ${method === id ? 'bg-primary text-black border-primary' : 'bg-white/5 text-white border-white/10'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <input className={input} placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            <div className="grid grid-cols-2 gap-2">
              <input className={input} placeholder="CPF (000.000.000-00)" inputMode="numeric" maxLength={14} value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} required />
              <input className={input} placeholder="Celular (11) 91234-5678" inputMode="tel" maxLength={15} value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} autoComplete="tel" required />
            </div>

            {(isSub || isChange || method === 'card') && (
              <>
                <div className="relative">
                  <input className={`${input} pr-24`} placeholder="Número do cartão" inputMode="numeric" maxLength={23} autoComplete="cc-number" value={number} onChange={(e) => setNumber(maskCardNumber(e.target.value))} required />
                  {cardBrand(number) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/80 bg-white/10 rounded px-2 py-0.5">
                      {cardBrand(number)}
                    </span>
                  )}
                </div>
                <input className={input} placeholder="Nome impresso no cartão" autoComplete="cc-name" value={holder} onChange={(e) => setHolder(e.target.value)} required />
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} placeholder="MM/AA" inputMode="numeric" maxLength={5} autoComplete="cc-exp" value={expiry} onChange={(e) => setExpiry(maskExpiry(e.target.value))} required />
                  <input className={input} placeholder="CVV" inputMode="numeric" maxLength={4} autoComplete="cc-csc" value={cvv} onChange={(e) => setCvv(digitsOnly(e.target.value).slice(0, 4))} required />
                </div>
              </>
            )}

            {chargeRows && (method === 'card' || isSub || isChange) && <ChargeSummary rows={chargeRows} />}

            {error && <p className="text-primary text-xs">{error}</p>}

            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 disabled:opacity-50">
              {busy
                ? 'Processando…'
                : isChange
                  ? config.payNow ? `Trocar cartão e pagar ${money}` : 'Salvar novo cartão'
                : isSub
                  ? config.trialDays > 0 ? 'Começar teste grátis' : `Assinar por ${money}/mês`
                  : method === 'pix' ? 'Gerar Pix' : `Pagar ${money}`}
            </button>
            <div className="flex items-start gap-2 text-white/40 text-[11px] leading-snug">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <p>
                Pagamento seguro. Os dados do cartão são enviados direto para a Pagar.me (Stone), que processa a
                cobrança, e não passam pelo VisuIA.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
