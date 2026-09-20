'use client';

import { useState, useEffect, useCallback } from 'react';

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
];

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [tab, setTab] = useState('config');

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
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-primary text-black' : 'bg-card-bg text-white/50 hover:text-white border border-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'config' && <ConfigTab adminKey={key} />}
        {tab === 'users' && <UsersTab adminKey={key} />}
        {tab === 'appearance' && <AppearanceTab adminKey={key} />}
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

  const search = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/users?key=${encodeURIComponent(adminKey)}&q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .finally(() => setLoading(false));
  }, [adminKey, query]);

  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    search();
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
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Buscar por e-mail…"
          className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
        />
        <button onClick={search} className="px-4 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity">
          Buscar
        </button>
      </div>

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
            <img src={`/api/assets/logo.png?v=${version}`} alt="Logo atual" className="max-w-full max-h-full object-contain" />
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
function SlotPreview({ slug, index, version }) {
  const [triedVideo, setTriedVideo] = useState(false);
  const base = `/api/assets/carousel/${slug}-${index}`;
  if (triedVideo) {
    return (
      <video
        src={`${base}.mp4?v=${version}`}
        muted
        loop
        autoPlay
        playsInline
        className="w-full h-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <img
      src={`${base}.jpg?v=${version}`}
      alt=""
      className="w-full h-full object-cover"
      onError={() => setTriedVideo(true)}
    />
  );
}
