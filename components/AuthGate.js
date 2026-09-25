'use client';

import { useState } from 'react';
import { useAssetsVersion } from '../lib/useAssetsVersion.js';
import Logo from './Logo';

export default function AuthGate({ onAuthenticated }) {
  const assetsVersion = useAssetsVersion();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
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
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080910] flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="bg-[#0F1119] border border-white/10 rounded-2xl p-8 w-full max-w-sm"
      >
        <Logo version={assetsVersion} className="h-20 w-auto max-w-full mb-2" />
        <p className="text-white/50 text-sm mb-6">
          {mode === 'login' ? 'Entre na sua conta.' : 'Crie sua conta para começar.'}
        </p>

        <label className="block text-white/60 text-xs mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-[#FF9500]/50"
        />

        <label className="block text-white/60 text-xs mb-1">Senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-[#FF9500]/50"
        />

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-[#FF9500] text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
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
