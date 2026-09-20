'use client';

import { useState } from 'react';

// Floating support button, rendered once in the root layout so it shows
// on every page. Opens a small panel with a quick contact form — no
// separate page to navigate to.
export default function SupportBubble() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const closeAndReset = () => {
    setOpen(false);
    setTimeout(() => {
      setSent(false);
      setName('');
      setEmail('');
      setMessage('');
      setError(null);
    }, 300);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-primary text-black shadow-glow flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Suporte"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:justify-end bg-black/50 sm:bg-transparent px-4 sm:px-0 sm:pr-6 sm:pb-24" onClick={closeAndReset}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0F1119] border border-white/10 rounded-2xl w-full sm:w-96 max-h-[85vh] overflow-y-auto p-6 mb-4 sm:mb-0 shadow-3xl"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-black text-lg">Fale com a gente</p>
              <button onClick={closeAndReset} className="text-white/40 hover:text-white" aria-label="Fechar">✕</button>
            </div>
            <p className="text-primary text-xs font-semibold mb-4">
              🇧🇷 Suporte todo em português — time brasileiro, sem tradução, sem enrolação.
            </p>

            {sent ? (
              <div className="py-6 text-center">
                <p className="text-white font-semibold mb-1">Mensagem enviada!</p>
                <p className="text-white/50 text-sm">Respondemos o quanto antes no seu e-mail.</p>
                <button onClick={closeAndReset} className="mt-4 text-primary text-sm font-semibold">Fechar</button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
                />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
                />
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Como podemos ajudar?"
                  rows={4}
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50 resize-none"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {sending ? 'Enviando…' : 'Enviar mensagem'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
