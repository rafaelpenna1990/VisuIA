'use client';

import { useState } from 'react';

// Same login/signup logic as AuthGate.js, but as an overlay instead of a
// full-page takeover — used on the landing page so clicking "Gerar" (or
// "Entrar") doesn't yank the visitor away to a blank auth screen.
export default function AuthModal({ initialMode = 'login', onAuthenticated, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'signup'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Algo deu errado');
      onAuthenticated(data.user, mode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#150E1C] border border-white/10 rounded-2xl p-8 w-full max-w-sm relative"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          ✕
        </button>

        <h1 className="text-white font-black text-xl mb-1">VisuIA</h1>
        <p className="text-white/50 text-sm mb-6">
          {mode === 'login' ? 'Entre na sua conta.' : 'Crie sua conta para começar.'}
        </p>

        {/* Continue with Google — full navigation to our OAuth route, not
            a fetch, since Google's consent screen has to be a real page. */}
        <a
          href="/api/auth/google"
          className="w-full mb-4 py-2.5 rounded-lg bg-white text-[#1a1a1a] font-semibold text-sm flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.52 12.27c0-.82-.07-1.42-.22-2.05H12v3.72h6.62c-.13 1.05-.85 2.63-2.45 3.69l-.02.15 3.56 2.7.25.02c2.27-2.06 3.56-5.1 3.56-8.23z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.05 7.95-2.86l-3.79-2.87c-1.02.69-2.39 1.17-4.16 1.17-3.18 0-5.88-2.07-6.84-4.94l-.14.01-3.7 2.8-.05.13C3.25 21.3 7.31 24 12 24z"/>
            <path fill="#FBBC05" d="M5.16 14.5c-.25-.72-.39-1.49-.39-2.5s.14-1.78.38-2.5l-.01-.16-3.75-2.83-.12.06C.36 8.44 0 10.17 0 12s.36 3.56 1.27 5.43l3.89-2.93z"/>
            <path fill="#EA4335" d="M12 4.77c2.26 0 3.79.94 4.66 1.73l3.4-3.25C17.95 1.21 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.57l3.88 2.93C6.12 6.84 8.82 4.77 12 4.77z"/>
          </svg>
          Continuar com Google
        </a>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-[10px] uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <label className="block text-white/60 text-xs mb-1">E-mail</label>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-[#FF5A36]/50"
        />

        <label className="block text-white/60 text-xs mb-1">Senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-[#FF5A36]/50"
        />

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-[#FF5A36] text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
          className="w-full mt-3 text-white/40 hover:text-white text-xs transition-colors"
        >
          {mode === 'login' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
