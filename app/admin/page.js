'use client';

import { useState, useEffect, useCallback } from 'react';
import Logo from '../../components/Logo';

const CATEGORY_SLUGS = [
  { slug: 'imagem', label: 'Imagem' },
  { slug: 'video', label: 'Vídeo' },
  { slug: 'sincronia-labial', label: 'Sincronia Labial' },
  { slug: 'cinema', label: 'Cinema' },
];

const TABS = [
  { id: 'config', label: 'Configurações' },
  { id: 'users', label: 'Usuários' },
  { id: 'appearance', label: 'Aparência' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'models', label: 'Modelos' },
  { id: 'errors', label: 'Erros' },
];

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [tab, setTab] = useState('config');
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    if (!authed) return;
    fetch(`/api/admin/failures?key=${encodeURIComponent(key)}`)
      .then((res) => res.json())
      .then((data) => setFailureCount(data.total || 0))
      .catch(() => {});
  }, [authed, key, tab]);

  // Try a saved key from sessionStorage so a refresh doesn't log you out.
  useEffect(() => {
    const saved = sessionStorage.getItem('visuia_admin_key');
    if (saved) {
      setKey(saved);
      setAuthed(true);
    }
  }, []);

  const tryLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error('Senha incorreta');
      sessionStorage.setItem('visuia_admin_key', key);
      setAuthed(true);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
        <form onSubmit={tryLogin} className="bg-[#0F1119] border border-white/10 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-white font-black text-xl mb-1">Painel Admin</h1>
          <p className="text-white/50 text-sm mb-6">VisuIA</p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Senha de admin"
            autoFocus
            className="w-full mb-4 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
          {authError && <p className="text-red-400 text-xs mb-4">{authError}</p>}
          <button type="submit" className="w-full py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-white">
      <header className="flex items-center justify-between px-6 md:px-10 py-5 max-w-6xl mx-auto">
        <h1 className="font-black text-lg">Painel Admin — VisuIA</h1>
        <button
          onClick={() => { sessionStorage.removeItem('visuia_admin_key'); setAuthed(false); }}
          className="text-white/50 hover:text-white text-sm transition-colors"
        >
          Sair
        </button>
      </header>

      <div className="px-6 md:px-10 max-w-6xl mx-auto">
        <nav className="flex items-center gap-2 mb-8 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                tab === t.id ? 'bg-primary text-black' : 'bg-card-bg text-white/50 hover:text-white border border-white/10'
              }`}
            >
              {t.label}
              {t.id === 'errors' && failureCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {failureCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {tab === 'config' && <ConfigTab adminKey={key} />}
        {tab === 'users' && <UsersTab adminKey={key} />}
        {tab === 'appearance' && <AppearanceTab adminKey={key} />}
        {tab === 'marketing' && <MarketingTab adminKey={key} />}
        {tab === 'models' && <ModelsTab adminKey={key} />}
        {tab === 'errors' && <ErrorsTab adminKey={key} />}
      </div>

      <div className="h-16" />
    </div>
  );
}

// ── Configurações ────────────────────────────────────────────────────────

function ConfigTab({ adminKey }) {
  const [settings, setSettings] = useState(null);
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    fetch(`/api/admin/settings?key=${encodeURIComponent(adminKey)}`)
      .then((res) => res.json())
      .then((data) => setSettings(data.settings));
    fetch(`/api/admin/plans?key=${encodeURIComponent(adminKey)}`)
      .then((res) => res.json())
      .then((data) => setPlans(data.plans || []));
  }, [adminKey]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      setMessage('Salvo!');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const savePlan = async (plan) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/plans?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error('Falha ao salvar plano');
      setMessage('Plano salvo!');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!settings) return <p className="text-white/40 text-sm">Carregando…</p>;

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold text-base mb-4">Câmbio e margem</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Dólar → Real (USD_TO_BRL)</label>
            <input
              type="number" step="0.01"
              value={settings.usd_to_brl}
              onChange={(e) => setSettings({ ...settings, usd_to_brl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Multiplicador de margem (ex: 7 = 7x)</label>
            <input
              type="number" step="0.1"
              value={settings.price_markup}
              onChange={(e) => setSettings({ ...settings, price_markup: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Bônus do trial de 7 dias (VisuTokens)</label>
            <input
              type="number"
              value={settings.trial_bonus_tokens}
              onChange={(e) => setSettings({ ...settings, trial_bonus_tokens: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Créditos grátis no cadastro (VisuTokens)</label>
            <input
              type="number"
              value={settings.signup_free_credits}
              onChange={(e) => setSettings({ ...settings, signup_free_credits: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1">Texto da promoção (aparece em destaque em várias páginas do site)</label>
          <input
            value={settings.promo_text || ''}
            onChange={(e) => setSettings({ ...settings, promo_text: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1">
            Título grande da página inicial — use **assim** ao redor do trecho que quer em laranja
          </label>
          <input
            value={settings.hero_title || ''}
            onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1">Subtítulo da página inicial</label>
          <input
            value={settings.hero_subtitle || ''}
            onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1">
            E-mail que recebe as mensagens da bolinha de suporte
          </label>
          <input
            type="email"
            value={settings.support_email || ''}
            onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
            placeholder="seuemail@exemplo.com"
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-white/50 mb-1">
            Taxa de entrada do trial (R$ — deixe 0 pra manter o trial 100% grátis)
          </label>
          <input
            type="number" step="0.01" min="0"
            value={settings.trial_entry_fee_cents ? (Number(settings.trial_entry_fee_cents) / 100).toFixed(2) : '0'}
            onChange={(e) => setSettings({ ...settings, trial_entry_fee_cents: Math.round(Number(e.target.value) * 100) })}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
          <p className="text-white/30 text-[11px] mt-1">
            Cobrada uma vez, na hora, além da mensalidade normal a partir do 7º dia. O texto do pop-up de assinatura se ajusta sozinho.
          </p>
        </div>
        <div className="mb-4 pt-4 border-t border-white/5">
          <h3 className="text-sm font-bold mb-3">📧 E-mail de boas-vindas</h3>
          <p className="text-white/30 text-[11px] mb-3">
            Enviado automaticamente pra todo mundo que se cadastra (e-mail/senha ou Google).
          </p>
          <label className="block text-xs text-white/50 mb-1">Selo (badge)</label>
          <input
            value={settings.welcome_email_badge || ''}
            onChange={(e) => setSettings({ ...settings, welcome_email_badge: e.target.value })}
            className="w-full mb-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
          <label className="block text-xs text-white/50 mb-1">Título</label>
          <input
            value={settings.welcome_email_headline || ''}
            onChange={(e) => setSettings({ ...settings, welcome_email_headline: e.target.value })}
            className="w-full mb-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
          <label className="block text-xs text-white/50 mb-1">Corpo do texto (uma frase por linha)</label>
          <textarea
            value={settings.welcome_email_body || ''}
            onChange={(e) => setSettings({ ...settings, welcome_email_body: e.target.value })}
            rows={4}
            className="w-full mb-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
          <label className="block text-xs text-white/50 mb-1">Texto do botão</label>
          <input
            value={settings.welcome_email_button_text || ''}
            onChange={(e) => setSettings({ ...settings, welcome_email_button_text: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
        </div>
        <p className="text-white/30 text-xs mb-4">
          Essas mudanças valem na hora, sem precisar reiniciar o site.
        </p>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold text-base mb-1">Planos de assinatura</h2>
        <p className="text-white/40 text-xs mb-4">
          Quem já assina continua no valor combinado na hora — isso só muda o que assinantes NOVOS veem e pagam.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan, idx) => (
            <div key={plan.id} className="bg-black/30 border border-white/10 rounded-xl p-4">
              <label className="block text-[10px] text-white/40 mb-1">Nome</label>
              <input
                value={plan.name}
                onChange={(e) => {
                  const next = [...plans]; next[idx] = { ...plan, name: e.target.value }; setPlans(next);
                }}
                className="w-full mb-3 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-primary/50"
              />
              <label className="block text-[10px] text-white/40 mb-1">Preço mensal (R$)</label>
              <input
                type="number"
                value={plan.amount_cents / 100}
                onChange={(e) => {
                  const next = [...plans]; next[idx] = { ...plan, amount_cents: Math.round(Number(e.target.value) * 100) }; setPlans(next);
                }}
                className="w-full mb-3 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-primary/50"
              />
              <label className="block text-[10px] text-white/40 mb-1">Preço "de" riscado (R$, opcional — deixe vazio pra não mostrar)</label>
              <input
                type="number"
                value={plan.promo_amount_cents != null ? plan.promo_amount_cents / 100 : ''}
                placeholder="ex: 39"
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Math.round(Number(e.target.value) * 100);
                  const next = [...plans]; next[idx] = { ...plan, promo_amount_cents: val }; setPlans(next);
                }}
                className="w-full mb-3 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-primary/50"
              />
              <label className="block text-[10px] text-white/40 mb-1">VisuTokens/mês</label>
              <input
                type="number"
                value={plan.tokens}
                onChange={(e) => {
                  const next = [...plans]; next[idx] = { ...plan, tokens: Number(e.target.value) }; setPlans(next);
                }}
                className="w-full mb-3 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-primary/50"
              />
              <button
                onClick={() => savePlan(plans[idx])}
                disabled={saving}
                className="w-full py-1.5 rounded-lg bg-primary text-black font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Salvar plano
              </button>
            </div>
          ))}
        </div>
      </div>

      {message && <p className="text-primary text-sm">{message}</p>}
    </div>
  );
}

// ── Usuários ──────────────────────────────────────────────────────────────

function UsersTab({ adminKey }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const search = useCallback((targetPage = 1) => {
    setLoading(true);
    fetch(`/api/admin/users?key=${encodeURIComponent(adminKey)}&q=${encodeURIComponent(query)}&page=${targetPage}`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, [adminKey, query]);

  useEffect(() => { search(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exportExcel = () => {
    window.open(`/api/admin/users/export?key=${encodeURIComponent(adminKey)}&q=${encodeURIComponent(query)}`, '_blank');
  };

  const addTokens = async (user) => {
    const amount = window.prompt(`Quantos VisuTokens adicionar pra ${user.email}? (negativo pra remover)`);
    if (!amount) return;
    const res = await fetch(`/api/admin/users/add-tokens?key=${encodeURIComponent(adminKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, tokens: Number(amount) }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error); return; }
    setMessage(`Saldo de ${user.email} agora: ${(data.newBalance * 100).toLocaleString('pt-BR')} VT`);
    search(page);
  };

  const resetPassword = async (user) => {
    const newPassword = window.prompt(`Nova senha pra ${user.email} (mín. 8 caracteres):`);
    if (!newPassword) return;
    const res = await fetch(`/api/admin/users/reset-password?key=${encodeURIComponent(adminKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error); return; }
    setMessage(`Senha de ${user.email} alterada.`);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(1)}
          placeholder="Buscar por e-mail…"
          className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
        />
        <button onClick={() => search(1)} className="px-4 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity">
          Buscar
        </button>
        <button onClick={exportExcel} className="px-4 py-2 rounded-lg bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors whitespace-nowrap">
          Baixar Excel
        </button>
      </div>

      {total > 0 && (
        <p className="text-white/30 text-xs mb-3">{total} usuário{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}</p>
      )}

      {message && <p className="text-primary text-sm mb-4">{message}</p>}
      {loading && <p className="text-white/40 text-sm">Buscando…</p>}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="bg-card-bg border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-white text-sm font-semibold">{u.email}</p>
              <p className="text-white/40 text-xs">
                Saldo: {(u.credits_balance * 100).toLocaleString('pt-BR')} VT · Cadastro: {new Date(u.created_at).toLocaleDateString('pt-BR')}
                {u.google_id && ' · Google'}{u.facebook_id && ' · Facebook'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setSelectedUserId(u.id)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">
                Ver histórico
              </button>
              <button onClick={() => addTokens(u)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                + Tokens
              </button>
              <button onClick={() => resetPassword(u)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white text-xs font-semibold hover:bg-white/10 transition-colors">
                Trocar senha
              </button>
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && <p className="text-white/30 text-sm">Nenhum usuário encontrado.</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => search(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-white/50 text-sm">Página {page} de {totalPages}</span>
          <button
            onClick={() => search(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}

      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} adminKey={adminKey} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}

const KIND_LABELS = { image: 'Imagem', i2i: 'Editar imagem', video: 'Vídeo', i2v: 'Imagem→Vídeo', lipsync: 'Sincronia Labial' };

function UserDetailModal({ userId, adminKey, onClose }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('generations');
  const [fixing, setFixing] = useState(null);

  const load = useCallback(() => {
    fetch(`/api/admin/users/detail?key=${encodeURIComponent(adminKey)}&userId=${userId}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: 'Falha ao carregar' }));
  }, [userId, adminKey]);

  useEffect(() => { load(); }, [load]);

  const fixStuckGeneration = async (generationId) => {
    setFixing(generationId);
    try {
      const res = await fetch(`/api/admin/generations/fail?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId }),
      });
      const result = await res.json();
      if (!res.ok) { alert(result.error); return; }
      load(); // refresh both tabs — balance and status both changed
    } finally {
      setFixing(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0F1119] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-white font-black text-lg">{data?.user?.email || 'Carregando…'}</p>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Fechar">✕</button>
        </div>

        {data?.user && (
          <p className="text-white/40 text-xs mb-4">
            Saldo: {(data.user.credits_balance * 100).toLocaleString('pt-BR')} VT · Cadastro: {new Date(data.user.created_at).toLocaleDateString('pt-BR')}
            {data.subscriptions?.[0] && ` · Assinatura: ${data.subscriptions[0].plan} (${data.subscriptions[0].status})`}
          </p>
        )}

        {data?.error && <p className="text-red-400 text-sm">{data.error}</p>}

        {data?.user && (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTab('generations')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === 'generations' ? 'bg-primary text-black' : 'bg-white/5 text-white/60'}`}
              >
                Gerações ({data.generations?.length || 0})
              </button>
              <button
                onClick={() => setTab('transactions')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === 'transactions' ? 'bg-primary text-black' : 'bg-white/5 text-white/60'}`}
              >
                Créditos ({data.transactions?.length || 0})
              </button>
              <button
                onClick={() => setTab('email')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === 'email' ? 'bg-primary text-black' : 'bg-white/5 text-white/60'}`}
              >
                E-mail
              </button>
            </div>

            {tab === 'generations' && (
              <div className="flex flex-col gap-2">
                {(data.generations || []).map((g) => (
                  <div key={g.id} className="bg-black/30 border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">
                        {KIND_LABELS[g.kind] || g.kind} · {g.model}
                      </p>
                      <p className="text-white/40 text-[11px]">
                        {new Date(g.created_at).toLocaleString('pt-BR')} · {g.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {g.status === 'pending' && (
                        <button
                          onClick={() => fixStuckGeneration(g.id)}
                          disabled={fixing === g.id}
                          title="Job travado — estorna o valor reservado e marca como falha"
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          {fixing === g.id ? 'Corrigindo…' : 'Corrigir'}
                        </button>
                      )}
                      <span className="text-primary text-xs font-bold">
                        {(g.cost_credits * 100).toLocaleString('pt-BR')} VT
                      </span>
                    </div>
                  </div>
                ))}
                {data.generations?.length === 0 && <p className="text-white/30 text-sm">Nenhuma geração ainda.</p>}
              </div>
            )}

            {tab === 'transactions' && (
              <div className="flex flex-col gap-2">
                {(data.transactions || []).map((t) => (
                  <div key={t.id} className="bg-black/30 border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{t.description || t.type}</p>
                      <p className="text-white/40 text-[11px]">{new Date(t.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${t.amount >= 0 ? 'text-primary' : 'text-white/60'}`}>
                      {t.amount >= 0 ? '+' : ''}{(t.amount * 100).toLocaleString('pt-BR')} VT
                    </span>
                  </div>
                ))}
                {data.transactions?.length === 0 && <p className="text-white/30 text-sm">Nenhuma transação ainda.</p>}
              </div>
            )}

            {tab === 'email' && <UserEmailTab user={data.user} adminKey={adminKey} />}
          </>
        )}
      </div>
    </div>
  );
}

function UserEmailTab({ user, adminKey }) {
  const [subject, setSubject] = useState('');
  const [badge, setBadge] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('https://www.visuia.ai/conta');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const inputClass = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50";
  const labelClass = "block text-xs text-white/50 mb-1";

  const send = async () => {
    if (!confirm(`Enviar esse e-mail pra ${user.email}?`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/users/send-email?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, subject, badge, headline, body, buttonText, buttonLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar');
      setResult({ ok: true });
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-white/40 text-xs">Enviando pra: <span className="text-white">{user.email}</span></p>

      <div>
        <label className={labelClass}>Assunto</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Selo pequeno (opcional)</label>
        <input value={badge} onChange={(e) => setBadge(e.target.value)} className={inputClass} placeholder="ex: Aviso importante" />
      </div>
      <div>
        <label className={labelClass}>Título</label>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Corpo (cada linha vira um parágrafo)</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={inputClass + " resize-y"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Texto do botão (opcional)</label>
          <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Link do botão</label>
          <input value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} className={inputClass} />
        </div>
      </div>

      <button
        onClick={send}
        disabled={sending || !subject.trim() || !headline.trim()}
        className="px-4 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 self-start"
      >
        {sending ? 'Enviando…' : `Enviar pra ${user.email}`}
      </button>

      {result?.error && <p className="text-red-400 text-xs">{result.error}</p>}
      {result?.ok && <p className="text-primary text-xs">Enviado!</p>}
    </div>
  );
}

// ── Aparência ─────────────────────────────────────────────────────────────

function AppearanceTab({ adminKey }) {
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [version, setVersion] = useState(1);

  useEffect(() => {
    fetch('/api/assets-version')
      .then((res) => res.json())
      .then((data) => setVersion(data.version || 1))
      .catch(() => {});
  }, []);

  const upload = async (file, target, slot) => {
    if (!file) return;
    const slotKey = slot || target;
    setUploading(slotKey);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target', target);
      if (slot) formData.append('slot', slot);
      const res = await fetch(`/api/admin/upload?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no envio');
      setVersion(data.version); // bumps every <img>/<video> below immediately
      setMessage('Salvo — a prévia abaixo já mostra o arquivo novo.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="max-w-3xl flex flex-col gap-8">
      <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold text-base mb-1">Logo</h2>
        <p className="text-white/40 text-xs mb-4">PNG, JPG ou WEBP. Aparece no cabeçalho, no menu lateral e na tela de login.</p>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            <Logo version={version} className="max-w-full max-h-full object-contain" />
          </div>
          <p className="text-white/30 text-xs">Prévia de como está agora</p>
        </div>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          onChange={(e) => upload(e.target.files[0], 'logo')}
          className="text-sm text-white/70 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-primary file:text-black file:font-semibold file:text-sm file:cursor-pointer"
        />
        {uploading === 'logo' && <p className="text-white/40 text-xs mt-2">Enviando…</p>}
      </div>

      <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold text-base mb-1">Carrossel de exemplos</h2>
        <p className="text-white/40 text-xs mb-6">
          Foto (.jpg/.png/.webp) ou vídeo (.mp4/.webm) — 3 posições por categoria. Aparecem na página inicial e em cada página /criar/....
        </p>
        <div className="flex flex-col gap-6">
          {CATEGORY_SLUGS.map((cat) => (
            <div key={cat.slug}>
              <p className="text-white text-sm font-semibold mb-2">{cat.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => {
                  const slotKey = `${cat.slug}-${i}`;
                  return (
                    <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-3">
                      <p className="text-white/40 text-[10px] mb-2">Posição {i}</p>
                      <div className="w-full aspect-video rounded-lg bg-black/40 border border-white/10 mb-2 overflow-hidden flex items-center justify-center">
                        <SlotPreview slug={cat.slug} index={i} version={version} />
                      </div>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
                        onChange={(e) => upload(e.target.files[0], 'carousel', slotKey)}
                        className="text-xs text-white/60 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-primary file:text-black file:font-semibold file:text-xs file:cursor-pointer w-full"
                      />
                      {uploading === slotKey && <p className="text-white/40 text-[10px] mt-1">Enviando…</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && <p className="text-primary text-sm">{message}</p>}
    </div>
  );
}

// Shows whichever of .jpg/.mp4 currently exists for a carousel slot — same
// try-image-then-video fallback the real site uses.
const PREVIEW_CANDIDATES = [
  { ext: 'jpg', type: 'image' },
  { ext: 'jpeg', type: 'image' },
  { ext: 'png', type: 'image' },
  { ext: 'webp', type: 'image' },
  { ext: 'mp4', type: 'video' },
  { ext: 'webm', type: 'video' },
];

function SlotPreview({ slug, index, version }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const base = `/api/assets/carousel/${slug}-${index}`;
  if (candidateIndex >= PREVIEW_CANDIDATES.length) {
    return <span className="text-white/20 text-[10px]">vazio</span>;
  }
  const candidate = PREVIEW_CANDIDATES[candidateIndex];
  const advance = () => setCandidateIndex((i) => i + 1);
  if (candidate.type === 'video') {
    return (
      <video
        key={candidate.ext}
        src={`${base}.${candidate.ext}?v=${version}`}
        muted
        loop
        autoPlay
        playsInline
        className="w-full h-full object-cover"
        onError={advance}
      />
    );
  }
  return (
    <img
      key={candidate.ext}
      src={`${base}.${candidate.ext}?v=${version}`}
      alt=""
      className="w-full h-full object-cover"
      onError={advance}
    />
  );
}

// ── Marketing ─────────────────────────────────────────────────────────────

function MarketingTab({ adminKey }) {
  const [segment, setSegment] = useState('no_subscription');
  const [segments, setSegments] = useState([]);
  const [count, setCount] = useState(null);
  const [countLoading, setCountLoading] = useState(true);

  const [subject, setSubject] = useState('🎁 Seus VisuTokens grátis ainda estão esperando');
  const [badge, setBadge] = useState('Oferta de boas-vindas');
  const [headline, setHeadline] = useState('Seus 500 VisuTokens grátis ainda estão esperando');
  const [body, setBody] = useState(
    'Você criou sua conta no VisuIA, mas ainda não assinou nenhum plano. Que tal experimentar de verdade?\n' +
    'Comece agora com 7 dias grátis — os 500 VisuTokens caem na sua conta na hora, sem cobrar nada do cartão até o 7º dia.\n' +
    'Crie imagens, vídeos, sincronia labial e efeitos de cinema com inteligência artificial — suporte 100% em português, sem enrolação.'
  );
  const [buttonText, setButtonText] = useState('Começar meus 7 dias grátis');
  const [buttonLink, setButtonLink] = useState('https://www.visuia.ai/conta?tab=assinatura');

  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const contentParams = () => ({
    segment, subject, badge, headline, body, buttonText, buttonLink,
  });

  const fetchCountAndSegments = useCallback((seg) => {
    setCountLoading(true);
    const qs = new URLSearchParams({ key: adminKey, segment: seg });
    fetch(`/api/admin/marketing/trial-reminder?${qs.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count ?? 0);
        setSegments(data.segments || []);
      })
      .catch(() => setCount(null))
      .finally(() => setCountLoading(false));
  }, [adminKey]);

  useEffect(() => { fetchCountAndSegments(segment); }, [segment, fetchCountAndSegments]);

  const refreshPreview = () => {
    setPreviewLoading(true);
    const qs = new URLSearchParams({ key: adminKey, ...contentParams() });
    fetch(`/api/admin/marketing/trial-reminder?${qs.toString()}`)
      .then((res) => res.json())
      .then((data) => setPreviewHtml(data.previewHtml))
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  };

  const send = async () => {
    if (!count) return;
    const seg = segments.find((s) => s.id === segment);
    if (!confirm(`Isso vai enviar de verdade pra ${count} pessoa${count === 1 ? '' : 's'} (${seg?.label || segment}). Confirmar?`)) {
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/marketing/trial-reminder?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contentParams()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar');
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50";
  const labelClass = "block text-xs text-white/50 mb-1";

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold text-base mb-1">Campanha por e-mail</h2>
        <p className="text-white/40 text-xs mb-5">
          Escolhe o público, escreve o texto, confere a prévia, e manda — tudo daqui, sem precisar de código.
        </p>

        <div className="mb-4">
          <label className={labelClass}>Público</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className={inputClass}
          >
            {(segments.length ? segments : [{ id: segment, label: 'Carregando…' }]).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <p className="text-white/30 text-[11px] mt-1">
            {countLoading ? 'Contando…' : (
              <>
                <span className="text-primary font-bold">{count}</span>{' '}
                {count === 1 ? 'pessoa vai receber' : 'pessoas vão receber'} esse e-mail
              </>
            )}
          </p>
        </div>

        <div className="mb-4">
          <label className={labelClass}>Assunto do e-mail</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
        </div>

        <div className="mb-4">
          <label className={labelClass}>Selo pequeno em cima do título (opcional)</label>
          <input value={badge} onChange={(e) => setBadge(e.target.value)} className={inputClass} placeholder="ex: Oferta de boas-vindas" />
        </div>

        <div className="mb-4">
          <label className={labelClass}>Título grande</label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} className={inputClass} />
        </div>

        <div className="mb-4">
          <label className={labelClass}>Texto do corpo (cada linha vira um parágrafo)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className={inputClass + " resize-y"}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className={labelClass}>Texto do botão (opcional)</label>
            <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Link do botão</label>
            <input value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={refreshPreview}
            disabled={previewLoading}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {previewLoading ? 'Gerando…' : 'Ver prévia'}
          </button>
          <button
            onClick={send}
            disabled={sending || !count}
            className="px-5 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? 'Enviando…' : `Enviar pra ${count ?? '…'} pessoa${count === 1 ? '' : 's'}`}
          </button>
        </div>

        {result?.error && <p className="text-red-400 text-sm mb-4">{result.error}</p>}
        {result?.ok && (
          <p className="text-primary text-sm mb-4">
            Enviado! {result.sent} de {result.total} com sucesso.
            {result.failed?.length > 0 && ` ${result.failed.length} falharam.`}
          </p>
        )}

        {previewHtml && (
          <div>
            <p className="text-white/40 text-xs mb-2">Prévia:</p>
            <div
              className="border border-white/10 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modelos ───────────────────────────────────────────────────────────────

function ModelsTab({ adminKey }) {
  const [categories, setCategories] = useState(null);
  const [query, setQuery] = useState('');
  const [toggling, setToggling] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);

  const load = useCallback(() => {
    fetch(`/api/admin/models?key=${encodeURIComponent(adminKey)}`)
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, [adminKey]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (modelId, disabled) => {
    setToggling(modelId);
    // Atualiza a tela na hora, sem esperar o servidor confirmar.
    setCategories((prev) =>
      prev.map((c) => ({ ...c, models: c.models.map((m) => (m.id === modelId ? { ...m, disabled } : m)) }))
    );
    try {
      await fetch(`/api/admin/models?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, disabled }),
      });
    } finally {
      setToggling(null);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = (categories || []).map((c) => ({
    ...c,
    models: q ? c.models.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) : c.models,
  })).filter((c) => c.models.length > 0);

  const totalDisabled = (categories || []).reduce((n, c) => n + c.models.filter((m) => m.disabled).length, 0);

  return (
    <div className="max-w-3xl flex flex-col gap-4">
      <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
        <h2 className="font-bold text-base mb-1">Modelos disponíveis</h2>
        <p className="text-white/40 text-xs mb-4">
          Desliga um modelo na hora (sem precisar mexer em código nem esperar deploy) — útil quando um modelo
          específico está com problema na Muapi. Quem estiver com o app aberto já para de ver esse modelo
          na próxima vez que abrir o estúdio.
          {totalDisabled > 0 && <span className="text-primary"> {totalDisabled} desligado{totalDisabled === 1 ? '' : 's'} agora.</span>}
        </p>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou id…"
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50 mb-4"
        />

        {categories === null && <p className="text-white/40 text-sm">Carregando…</p>}

        {categories !== null && filtered.length === 0 && (
          <p className="text-white/30 text-sm">Nenhum modelo encontrado.</p>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((c) => {
            const isOpen = openCategory === c.key || q.length > 0;
            const disabledInCategory = c.models.filter((m) => m.disabled).length;
            return (
              <div key={c.key} className="border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenCategory(isOpen ? null : c.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-black/20 hover:bg-black/30 transition-colors text-left"
                >
                  <span className="text-white text-sm font-semibold">
                    {c.label} <span className="text-white/30 font-normal">({c.models.length})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {disabledInCategory > 0 && (
                      <span className="text-[10px] text-red-400 font-semibold">{disabledInCategory} desligado{disabledInCategory === 1 ? '' : 's'}</span>
                    )}
                    <span className={`text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-white/5">
                    {c.models.map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${m.disabled ? 'text-white/40 line-through' : 'text-white'}`}>{m.name}</p>
                          <p className="text-white/30 text-[11px] truncate">{m.id}</p>
                        </div>
                        <button
                          onClick={() => toggle(m.id, !m.disabled)}
                          disabled={toggling === m.id}
                          className={`shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            m.disabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          {toggling === m.id ? '…' : m.disabled ? 'Reativar' : 'Desligar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Erros ─────────────────────────────────────────────────────────────────

// Toda mensagem de erro que o sistema grava hoje cai em um destes padrões.
// Isso classifica o texto salvo em error_message e devolve um rótulo curto,
// o que aquilo significa, e o que fazer a respeito — pra não precisar
// decorar nem ficar perguntando toda vez que aparecer uma falha nova.
const ERROR_GUIDE = [
  {
    id: 'submit_rejected',
    match: (msg) => msg.startsWith('API Request Failed:'),
    label: 'Pedido recusado no envio',
    color: 'bg-orange-500/15 text-orange-400',
    meaning: 'A Muapi recusou o pedido antes mesmo de começar a gerar — geralmente um parâmetro inválido, campo obrigatório faltando, imagem/formato não aceito, ou saldo insuficiente do lado da Muapi.',
    action: 'Veja o texto completo do erro (abaixo do rótulo) — costuma apontar exatamente qual campo ou parâmetro está errado. Se for saldo, é a conta da Muapi, não a sua.',
  },
  {
    id: 'generation_failed',
    match: (msg) => msg.startsWith('Generation failed:'),
    label: 'Recusado pela Muapi',
    color: 'bg-red-500/15 text-red-400',
    meaning: 'A Muapi processou o pedido e recusou o resultado, dizendo o motivo explicitamente — ex: violação de política de conteúdo, imagem rejeitada, bloqueio de NSFW, ou limitação do próprio modelo.',
    action: 'É o mais confiável dos erros — o motivo já vem escrito pela própria Muapi. Normalmente não é bug seu; se for algo recorrente com um tipo de imagem/prompt, vale avisar o usuário.',
  },
  {
    id: 'poll_failed',
    match: (msg) => msg.startsWith('Poll Failed:'),
    label: 'Erro ao consultar status',
    color: 'bg-yellow-500/15 text-yellow-400',
    meaning: 'Erro inesperado ao perguntar pra Muapi "como está esse job?" — um código HTTP fora do normal (ex: 401/403), o que pode indicar problema de autenticação com a chave da API ou uma mudança na API da Muapi.',
    action: 'Se aparecer em vários modelos ao mesmo tempo, confira a MUAPI_API_KEY no Railway. Se for isolado, pode ser uma instabilidade pontual.',
  },
  {
    id: 'muapi_stuck',
    match: (msg) => msg.startsWith('A Muapi não conseguiu processar esse pedido'),
    label: 'Instabilidade da Muapi',
    color: 'bg-yellow-500/15 text-yellow-400',
    meaning: 'O job ficou 20+ segundos recebendo erro da Muapi ao consultar o status — sinal de que o modelo está fora do ar ou lento do lado deles (já aconteceu antes com o upscaler e o video effects).',
    action: 'Normalmente é temporário e some sozinho. Se um modelo específico acumular muitos desses, considere desligá-lo temporariamente (botão abaixo) e avisar o suporte da Muapi.',
  },
  {
    id: 'stuck_no_error',
    match: (msg) => msg.startsWith('Sem erro explícito'),
    label: 'Travou sem aviso (corrigido manualmente)',
    color: 'bg-white/10 text-white/60',
    meaning: 'O job ficou parado em "pending" e nunca recebeu um erro real — nem o cliente, nem o servidor souberam o motivo. Isso foi resolvido manualmente pelo botão "Corrigir", usando o último status conhecido da Muapi como registro.',
    action: 'Olhe o "status" e "executionTime" no texto — se executionTime ficou em 0 por muito tempo, é fila/instabilidade da Muapi. Não precisa de ação a menos que se repita muito com o mesmo modelo.',
  },
];

function classifyError(message) {
  if (!message) return null;
  return ERROR_GUIDE.find((g) => g.match(message)) || null;
}

function ErrorsGuidePanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-black/20 hover:bg-black/30 transition-colors text-left"
      >
        <span className="text-white/70 text-xs font-semibold">📖 Guia: o que cada erro significa e o que fazer</span>
        <span className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="divide-y divide-white/5">
          {ERROR_GUIDE.map((g) => (
            <div key={g.id} className="px-4 py-3">
              <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${g.color}`}>{g.label}</span>
              <p className="text-white/50 text-[11px] mt-1.5"><span className="text-white/70 font-semibold">O que é: </span>{g.meaning}</p>
              <p className="text-white/50 text-[11px] mt-1"><span className="text-white/70 font-semibold">O que fazer: </span>{g.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorsTab({ adminKey }) {
  const [data, setData] = useState(null);
  const [openModel, setOpenModel] = useState(null);
  const [disabling, setDisabling] = useState(null);
  const [date, setDate] = useState('');

  const load = useCallback(() => {
    const qs = date ? `&date=${date}` : '';
    fetch(`/api/admin/failures?key=${encodeURIComponent(adminKey)}${qs}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: 'Falha ao carregar' }));
  }, [adminKey, date]);

  useEffect(() => { load(); }, [load]);

  const disableModel = async (model) => {
    if (!confirm(`Desligar "${model}" agora? Ele some da lista de opções pros clientes até você reativar.`)) return;
    setDisabling(model);
    try {
      await fetch(`/api/admin/models?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: model, disabled: true }),
      });
      alert('Modelo desligado — já sumiu da lista de opções.');
    } finally {
      setDisabling(null);
    }
  };

  return (
    <div className="max-w-3xl flex flex-col gap-4">
      <div className="bg-card-bg border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-base">Gerações com erro</h2>
          <button onClick={load} className="text-white/40 hover:text-white text-xs">↻ Atualizar</button>
        </div>
        <p className="text-white/40 text-xs mb-3">
          {date
            ? 'Mostrando só o dia selecionado — agrupado por modelo.'
            : 'Últimos 7 dias, agrupado por modelo — assim um problema pontual não se perde no meio de tudo, e um modelo quebrado de verdade fica óbvio pela quantidade.'}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs text-white/50">Filtrar por dia:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs outline-none focus:border-primary/50"
          />
          {date && (
            <button onClick={() => setDate('')} className="text-white/40 hover:text-white text-xs underline">
              Limpar (voltar pros últimos 7 dias)
            </button>
          )}
        </div>

        <ErrorsGuidePanel />

        {!data && <p className="text-white/40 text-sm">Carregando…</p>}
        {data?.error && <p className="text-red-400 text-sm">{data.error}</p>}

        {data && !data.error && data.groups.length === 0 && (
          <p className="text-primary text-sm">
            {date ? 'Nenhuma falha nesse dia. 🎉' : 'Nenhuma falha nos últimos 7 dias. 🎉'}
          </p>
        )}

        {data && !data.error && data.groups.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.groups.map((g) => {
              const isOpen = openModel === g.model;
              return (
                <div key={g.model} className="border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenModel(isOpen ? null : g.model)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-black/20 hover:bg-black/30 transition-colors text-left"
                  >
                    <span className="text-white text-sm font-semibold">
                      {g.model} <span className="text-red-400 font-bold">({g.count})</span>
                    </span>
                    <span className={`text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {isOpen && (
                    <div>
                      <div className="px-4 py-2 border-b border-white/5">
                        <button
                          onClick={() => disableModel(g.model)}
                          disabled={disabling === g.model}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          {disabling === g.model ? 'Desligando…' : 'Desligar esse modelo agora'}
                        </button>
                      </div>
                      <div className="divide-y divide-white/5">
                        {g.items.map((f) => {
                          const guide = classifyError(f.error_message);
                          return (
                            <div key={f.id} className="px-4 py-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-white/70 text-xs">{f.user_email} · {new Date(f.created_at).toLocaleString('pt-BR')}</p>
                                {guide && (
                                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold ${guide.color}`}>{guide.label}</span>
                                )}
                              </div>
                              <p className="text-white/40 text-[11px] mt-0.5 break-words">{f.error_message || '(sem detalhe do erro)'}</p>
                              {guide && (
                                <p className="text-primary/70 text-[11px] mt-1">👉 {guide.action}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
