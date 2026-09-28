'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('As senhas não são iguais');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Algo deu errado');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#080910] flex items-center justify-center px-4">
        <div className="bg-[#0F1119] border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-white/70 text-sm">
            Esse link está incompleto. Peça um novo link em "Esqueci minha senha" na tela de login.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#080910] flex items-center justify-center px-4">
        <div className="bg-[#0F1119] border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-white text-lg font-bold mb-2">Senha redefinida! 🎉</p>
          <p className="text-white/50 text-sm mb-6">Já pode entrar com sua senha nova.</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-xl bg-[#FF9500] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080910] flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="bg-[#0F1119] border border-white/10 rounded-2xl p-8 w-full max-w-sm"
      >
        <p className="text-white text-lg font-bold mb-1">Escolha uma senha nova</p>
        <p className="text-white/50 text-sm mb-6">Pelo menos 8 caracteres.</p>

        <label className="block text-white/60 text-xs mb-1">Nova senha</label>
        <input
          type="password"
          required
          minLength={8}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-[#FF9500]/50"
        />

        <label className="block text-white/60 text-xs mb-1">Confirmar nova senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-[#FF9500]/50"
        />

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-[#FF9500] text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Aguarde…' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
