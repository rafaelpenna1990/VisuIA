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

// Formulário de pagamento do VisuIA (cartão e Pix) usando a Pagar.me.
// O número do cartão vai direto do navegador para a Pagar.me (tokenização com
// a chave pública) — nosso servidor só recebe o token.
//
// config vem da API: { kind: 'subscription'|'pack', publicKey, plan|pack, trialDays }
export default function PagarmeCardModal({ config, onClose, onSuccess }) {
  const isSub = config.kind === 'subscription';
  const amountCents = isSub ? config.plan.amount_cents : config.pack.amount_cents;
  const title = isSub ? `Plano ${config.plan.name}` : config.pack.label;
  const money = `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`;

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
      if (isSub) {
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
          {isSub
            ? config.trialDays > 0
              ? `${config.trialDays} dias grátis, depois ${money}/mês. Cancele quando quiser.`
              : `${money}/mês. Cancele quando quiser.`
            : `Pagamento único de ${money}.`}
        </p>

        {done ? (
          <p className="text-green-400 font-semibold text-sm py-6 text-center">Pagamento confirmado! Atualizando…</p>
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
            {!isSub && (
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

            {(isSub || method === 'card') && (
              <>
                <input className={input} placeholder="Número do cartão" inputMode="numeric" maxLength={23} autoComplete="cc-number" value={number} onChange={(e) => setNumber(maskCardNumber(e.target.value))} required />
                <input className={input} placeholder="Nome impresso no cartão" autoComplete="cc-name" value={holder} onChange={(e) => setHolder(e.target.value)} required />
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} placeholder="MM/AA" inputMode="numeric" maxLength={5} autoComplete="cc-exp" value={expiry} onChange={(e) => setExpiry(maskExpiry(e.target.value))} required />
                  <input className={input} placeholder="CVV" inputMode="numeric" maxLength={4} autoComplete="cc-csc" value={cvv} onChange={(e) => setCvv(digitsOnly(e.target.value).slice(0, 4))} required />
                </div>
              </>
            )}

            {error && <p className="text-primary text-xs">{error}</p>}

            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 disabled:opacity-50">
              {busy
                ? 'Processando…'
                : isSub
                  ? config.trialDays > 0 ? 'Começar teste grátis' : `Assinar por ${money}/mês`
                  : method === 'pix' ? 'Gerar Pix' : `Pagar ${money}`}
            </button>
            <p className="text-white/30 text-[11px] text-center">Pagamento processado com segurança pela Pagar.me (Stone).</p>
          </form>
        )}
      </div>
    </div>
  );
}
