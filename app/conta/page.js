'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatTokens } from '../../lib/tokens.js';
import { usePromoText } from '../../lib/usePromoText.js';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'projetos', label: 'Meus Projetos' },
  { id: 'assinatura', label: 'Assinatura' },
];

const KIND_LABELS = {
  image: 'Imagem',
  i2i: 'Imagem',
  video: 'Vídeo',
  i2v: 'Vídeo',
  lipsync: 'Sincronia Labial',
};

function isVideoKind(kind) {
  return kind === 'video' || kind === 'i2v' || kind === 'lipsync';
}

function formatDate(iso) {
  return new Date(iso + 'Z').toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function ContaContent() {
  const router = useRouter();
  const promoText = usePromoText();
  const searchParams = useSearchParams();
  const initialTab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'perfil';

  const [tab, setTab] = useState(initialTab);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState(null);
  const [projectsError, setProjectsError] = useState(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [subscription, setSubscription] = useState(undefined); // undefined = loading, null = none
  const [plans, setPlans] = useState([]);
  const [subscribing, setSubscribing] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [endingTrial, setEndingTrial] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) { router.push('/studio'); return; }
        setUser(data.user);
      });
  }, [router]);

  useEffect(() => {
    if (tab !== 'projetos' || projects) return;
    fetch('/api/generations', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProjects(data.generations);
      })
      .catch((err) => setProjectsError(err.message));
  }, [tab, projects]);

  useEffect(() => {
    if (tab !== 'assinatura' || subscription !== undefined) return;
    fetch('/api/billing/subscription', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setSubscription(data.subscription || null))
      .catch(() => setSubscription(null));
  }, [tab, subscription]);

  useEffect(() => {
    if (tab !== 'assinatura' || plans.length > 0) return;
    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => setPlans(data.plans || []))
      .catch(() => {});
  }, [tab, plans]);

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar a assinatura');
      window.location.href = data.checkout_url;
    } catch (err) {
      alert(err.message);
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Cancelar sua assinatura? Você continua com acesso até o fim do período já pago.')) return;
    setCanceling(true);
    try {
      const res = await fetch('/api/billing/cancel-subscription', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível cancelar');
      setSubscription((prev) => (prev ? { ...prev, status: 'canceling' } : prev));
    } catch (err) {
      alert(err.message);
    } finally {
      setCanceling(false);
    }
  };

  const handleEndTrial = async () => {
    if (!confirm('Isso cobra seu cartão agora (em vez de esperar o fim dos 7 dias grátis) e libera o restante dos VisuTokens do plano na hora. Continuar?')) return;
    setEndingTrial(true);
    try {
      const res = await fetch('/api/billing/end-trial', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível antecipar a cobrança');
      alert('Cobrança feita! Seu saldo já foi atualizado.');
      setSubscription((prev) => (prev ? { ...prev, status: 'active' } : prev));
      fetch('/api/auth/me', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => setUser(d.user));
    } catch (err) {
      alert(err.message);
    } finally {
      setEndingTrial(false);
    }
  };

  const changeTab = (id) => {
    setTab(id);
    router.replace(`/conta?tab=${id}`, { scroll: false });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/studio');
  };

  const filteredProjects = projects?.filter((item) => {
    if (projectFilter === 'all') return true;
    if (projectFilter === 'image') return !isVideoKind(item.kind);
    return isVideoKind(item.kind);
  });

  return (
    <div className="min-h-screen bg-app-bg px-4 sm:px-6 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white font-black text-2xl">Minha Conta</h1>
          <button
            onClick={() => router.push('/studio')}
            className="text-sm font-semibold text-white/70 hover:text-white transition-colors border border-white/10 rounded-xl px-4 py-2"
          >
            ← Voltar ao Estúdio
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-white/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-primary border-primary'
                  : 'text-white/50 border-transparent hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Perfil */}
        {tab === 'perfil' && user && (
          <div className="max-w-md">
            <div className="bg-card-bg border border-white/10 rounded-2xl p-6 mb-4">
              <p className="text-white/40 text-xs mb-1">E-mail</p>
              <p className="text-white text-sm mb-4">{user.email}</p>
              <p className="text-white/40 text-xs mb-1">Saldo</p>
              <p className="text-primary font-bold text-xl">{formatTokens(user.credits_balance)}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold transition-colors"
            >
              Sair da conta
            </button>
          </div>
        )}

        {/* Projetos */}
        {tab === 'projetos' && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'image', label: 'Imagens' },
                { id: 'video', label: 'Vídeos' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setProjectFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    projectFilter === f.id
                      ? 'bg-primary text-black'
                      : 'bg-card-bg text-white/60 hover:text-white border border-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {projectsError && <p className="text-red-400 text-sm mb-6">{projectsError}</p>}

            {!projects && !projectsError && (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin text-primary text-3xl">◌</div>
              </div>
            )}

            {projects && filteredProjects.length === 0 && (
              <div className="text-center py-24">
                <p className="text-white/40 text-sm mb-4">
                  {projectFilter === 'all' ? 'Você ainda não gerou nada.' : 'Nada por aqui ainda nesse filtro.'}
                </p>
                <button
                  onClick={() => router.push('/studio')}
                  className="bg-primary text-black font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                >
                  Criar minha primeira geração
                </button>
              </div>
            )}

            {filteredProjects && filteredProjects.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProjects.map((item) => (
                  <div key={item.id} className="bg-card-bg border border-white/10 rounded-2xl overflow-hidden group">
                    <div className="aspect-square bg-black/40 relative">
                      {isVideoKind(item.kind) ? (
                        <video
                          src={item.output_url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        />
                      ) : (
                        <img src={item.output_url} alt={item.model} className="w-full h-full object-cover" />
                      )}
                      <a
                        href={item.output_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-primary hover:text-black"
                        title="Baixar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                      </a>
                    </div>
                    <div className="p-3">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        {KIND_LABELS[item.kind] || item.kind}
                      </span>
                      <p className="text-white/40 text-[11px] truncate">{item.model}</p>
                      <p className="text-white/30 text-[10px] mt-1">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assinatura */}
        {tab === 'assinatura' && (
          <div className="max-w-2xl">
            {subscription === undefined && (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin text-primary text-2xl">◌</div>
              </div>
            )}

            {subscription === null && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
                    {promoText}
                  </span>
                </div>
                <p className="text-white/50 text-sm mb-6">
                  Assine um plano mensal e receba VisuTokens todo mês, com bônus quanto maior o plano.
                  Os tokens acumulam se você não usar tudo.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="bg-card-bg border border-white/10 rounded-2xl p-6 flex flex-col">
                      <p className="text-white font-black text-lg mb-1">{plan.name}</p>
                      {plan.promo_amount_cents != null && plan.promo_amount_cents > plan.amount_cents && (
                        <p className="text-white/40 text-sm line-through mb-0.5">
                          R$ {(plan.promo_amount_cents / 100).toFixed(0)}/mês
                        </p>
                      )}
                      <p className="text-primary font-bold text-2xl mb-1">
                        R$ {(plan.amount_cents / 100).toFixed(0)}
                        <span className="text-white/40 text-sm font-normal">/mês</span>
                      </p>
                      <p className="text-white/50 text-sm mb-6">{plan.tokens.toLocaleString('pt-BR')} VisuTokens/mês</p>
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={subscribing !== null}
                        className="mt-auto w-full py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {subscribing === plan.id ? 'Redirecionando…' : 'Assinar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subscription && (
              <div className="bg-card-bg border border-white/10 rounded-2xl p-6 max-w-md">
                <p className="text-white/40 text-xs mb-1">Plano atual</p>
                <p className="text-white font-black text-xl mb-4">{subscription.planName}</p>
                <p className="text-white/40 text-xs mb-1">VisuTokens por mês</p>
                <p className="text-primary font-bold text-lg mb-4">
                  {subscription.tokensPerMonth.toLocaleString('pt-BR')} VisuTokens
                </p>

                {subscription.status === 'trialing' && (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
                    <p className="text-primary text-sm font-semibold mb-1">Você está no período grátis de 7 dias</p>
                    <p className="text-white/50 text-xs mb-3">
                      Sem cobrar nada do cartão ainda. Se o saldo grátis acabar antes do 7º dia, dá pra antecipar
                      a cobrança e já receber o restante dos tokens do plano agora.
                    </p>
                    <button
                      onClick={handleEndTrial}
                      disabled={endingTrial}
                      className="w-full py-2 rounded-lg bg-primary text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {endingTrial ? 'Processando…' : 'Antecipar cobrança e receber o restante'}
                    </button>
                  </div>
                )}

                {subscription.status === 'canceling' ? (
                  <p className="text-yellow-400 text-sm mb-4">
                    Cancelamento agendado — você mantém o acesso até o fim do período já pago.
                  </p>
                ) : (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={canceling}
                    className="w-full py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {canceling ? 'Cancelando…' : 'Cancelar assinatura'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContaPage() {
  return (
    <Suspense fallback={null}>
      <ContaContent />
    </Suspense>
  );
}
