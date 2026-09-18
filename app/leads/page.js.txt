'use client';

import { useState } from 'react';

function formatDate(iso) {
  return new Date(iso + 'Z').toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatBRL(n) {
  return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function LeadsPage() {
  const [key, setKey] = useState('');
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads?key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar');
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!users) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
        <form onSubmit={load} className="bg-card-bg border border-white/10 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-white font-black text-xl mb-1">Leads</h1>
          <p className="text-white/50 text-sm mb-6">Digite a senha de administrador</p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Carregando…' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-white font-black text-2xl mb-1">Leads</h1>
        <p className="text-white/50 text-sm mb-8">{users.length} pessoas cadastradas</p>
        <div className="bg-card-bg border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 text-xs uppercase tracking-widest border-b border-white/10">
                <th className="px-5 py-3 font-semibold">E-mail</th>
                <th className="px-5 py-3 font-semibold">Saldo</th>
                <th className="px-5 py-3 font-semibold">Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-white">{u.email}</td>
                  <td className="px-5 py-3 text-primary font-semibold">{formatBRL(u.credits_balance)}</td>
                  <td className="px-5 py-3 text-white/50">{formatDate(u.created_at)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-white/30">
                    Nenhum cadastro ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}