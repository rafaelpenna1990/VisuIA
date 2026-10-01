'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatTokens } from '../../lib/tokens.js';
import { usePromoText } from '../../lib/usePromoText.js';
import TopUpModal from '../../components/TopUpModal';
import { generateI2I } from '../../packages/studio/src/api-client.js';

const TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'projetos', label: 'Meus Projetos' },
  { id: 'historico', label: 'Histórico' },
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

// Builds a public /share link for a result — mesma lógica do ImageStudio.jsx
// (ver app/share/page.js). Sem chamada de backend, sem linha de banco: a
// URL da mídia já é pública no CDN do Muapi, então o link só carrega ela
// (+ tipo + um trecho curto do prompt, se tiver) como query params.
function buildShareUrl(mediaUrl, kind, promptText) {
  const params = new URLSearchParams({ u: mediaUrl, t: kind });
  if (promptText) params.set('p', promptText.slice(0, 200));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/share?${params.toString()}`;
}

// Lê o tamanho real da imagem no navegador (não precisa de CORS — só
// naturalWidth/naturalHeight, não acessa pixels). Evita mandar pro
// "ai-image-upscaler" uma imagem que o Muapi já recusa de cara: esse
// modelo dá IMAGE_DIMENSIONS_TOO_LARGE pra qualquer lado acima de 2048px
// (confirmado num erro real, 2026-10-01) — comum quando a imagem já foi
// melhorada uma vez antes, ou veio de um modelo cujo tamanho nativo já é
// grande.
function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem'));
    img.src = url;
  });
}

function ContaContent() {
  const router = useRouter();
  const promoText = usePromoText();
  const searchParams = useSearchParams();
  const initialTab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'perfil';

  const [tab, setTab] = useState(initialTab);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [projectsError, setProjectsError] = useState(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [subscription, setSubscription] = useState(undefined); // undefined = loading, null = none
  const [plans, setPlans] = useState([]);
  const [subscribing, setSubscribing] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);

  // Compartilhar / Melhorar na galeria de projetos — mesmo par de ações que
  // já existe na tela de resultado do Estúdio, agora também disponível aqui.
  const [sharedId, setSharedId] = useState(null);
  const [upscalingId, setUpscalingId] = useState(null);

  // OpenAI/ChatGPT Ads conversion — fires once, right when the person
  // lands back here after a successful Stripe checkout for a subscription.
  useEffect(() => {
    if (searchParams.get('sub') === 'success' && typeof window !== 'undefined' && window.oaiq) {
      window.oaiq('measure', 'subscription_created', { type: 'plan_enrollment' });
    }
  }, [searchParams]);
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
    if (tab !== 'historico' || transactions) return;
    fetch('/api/transactions', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setTransactions(data.transactions || []))
      .catch(() => setTransactions([]));
  }, [tab, transactions]);

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

  // Compartilhar um item da galeria — copia o link público pra área de
  // transferência, sem chamar API nem cobrar nada.
  const handleShareProject = async (item) => {
    const shareUrl = buildShareUrl(item.output_url, isVideoKind(item.kind) ? 'video' : 'image', item.prompt);
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      window.prompt('Copie o link do compartilhamento:', shareUrl);
      return;
    }
    setSharedId(item.id);
    setTimeout(() => setSharedId((prev) => (prev === item.id ? null : prev)), 2000);
  };

  // Melhorar um item da galeria — reusa o mesmo pipeline generateI2I do
  // Estúdio (cobra 1 geração extra, mesma regra de sempre). O resultado
  // entra como uma geração nova no banco, então recarregamos a lista em
  // vez de tentar montar a entrada na mão.
  const handleUpscaleProject = async (item) => {
    if (upscalingId) return;

    try {
      const { width, height } = await getImageDimensions(item.output_url);
      if (width > 2048 || height > 2048) {
        alert('Essa imagem já é grande demais para melhorar — o modelo de upscale aceita até 2048px de largura/altura, e essa imagem já passa disso.');
        return;
      }
    } catch {
      // não deu pra medir (ex.: CORS) — segue e deixa a API decidir
    }

    setUpscalingId(item.id);
    try {
      await generateI2I(null, {
        model: 'ai-image-upscaler',
        image_url: item.output_url,
        images_list: [item.output_url],
      });
      const res = await fetch('/api/generations', { credentials: 'include' });
      const data = await res.json();
      if (!data.error) setProjects(data.generations);
    } catch (err) {
      alert(err.insufficientCredits ? 'Você não tem VisuTokens suficientes para melhorar essa imagem.' : err.message);
    } finally {
      setUpscalingId(null);
    }
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

            <ChangePasswordCard hasPassword={user.has_password} />

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

                      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleShareProject(item)}
                          className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-primary hover:text-black transition-colors"
                          title={sharedId === item.id ? 'Link copiado!' : 'Compartilhar'}
                        >
                          {sharedId === item.id ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="18" cy="5" r="3" />
                              <circle cx="6" cy="12" r="3" />
                              <circle cx="18" cy="19" r="3" />
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                          )}
                        </button>

                        {!isVideoKind(item.kind) && (
                          <button
                            type="button"
                            onClick={() => handleUpscaleProject(item)}
                            disabled={upscalingId !== null}
                            className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-primary hover:text-black transition-colors disabled:opacity-50"
                            title="Melhorar (cobra 1 geração extra)"
                          >
                            {upscalingId === item.id ? (
                              <span className="animate-spin text-[11px] leading-none">◌</span>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
                              </svg>
                            )}
                          </button>
                        )}

                        <a
                          href={item.output_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-primary hover:text-black transition-colors"
                          title="Baixar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                          </svg>
                        </a>
                      </div>
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

        {/* Histórico de créditos */}
        {tab === 'historico' && (
          <div className="max-w-2xl">
            <div className="bg-card-bg border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-white/70 text-sm leading-relaxed">
                💡 Quando você gera algo, cobramos uma <strong className="text-white">estimativa</strong> antes
                de começar, só pra garantir que dá pra pagar. Assim que termina, devolvemos essa estimativa
                e cobramos só o <strong className="text-white">valor real</strong> — que costuma ser bem menor.
                Se a geração falhar por algum motivo, você recebe de volta tudo que foi reservado.
              </p>
            </div>

            {transactions === null && (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin text-primary text-2xl">◌</div>
              </div>
            )}

            {transactions?.length === 0 && (
              <p className="text-white/30 text-sm">Nenhuma movimentação ainda.</p>
            )}

            {transactions && transactions.length > 0 && (
              <div className="flex flex-col gap-2">
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="bg-card-bg border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{t.description || t.type}</p>
                      <p className="text-white/40 text-xs mt-0.5">{formatDate(t.created_at)}</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${t.amount >= 0 ? 'text-primary' : 'text-white/50'}`}>
                      {t.amount >= 0 ? '+' : ''}{(t.amount * 100).toLocaleString('pt-BR')} VT
                    </span>
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

            {subscription !== undefined && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowTopUp(true)}
                  className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity border border-primary/30 rounded-full px-4 py-2"
                >
                  Comprar VisuTokens avulsos
                </button>
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

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
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

// Formulário de trocar senha, dentro da aba Perfil. Contas Google-only
// (hasPassword === false) não têm "senha atual" pra conferir — nesse
// caso o formulário já nasce definindo a primeira senha da conta.
function ChangePasswordCard({ hasPassword }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirm) {
      setError('As senhas novas não são iguais');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Algo deu errado');
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-4 py-2.5 rounded-xl bg-card-bg border border-white/10 text-white/70 hover:text-white text-sm font-semibold transition-colors"
      >
        {hasPassword ? 'Alterar senha' : 'Criar uma senha'}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-card-bg border border-white/10 rounded-2xl p-6 mb-4"
    >
      <p className="text-white text-sm font-semibold mb-4">
        {hasPassword ? 'Alterar senha' : 'Criar uma senha'}
      </p>

      {hasPassword && (
        <>
          <label className="block text-white/60 text-xs mb-1">Senha atual</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
        </>
      )}

      <label className="block text-white/60 text-xs mb-1">Nova senha</label>
      <input
        type="password"
        required
        minLength={8}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
      />

      <label className="block text-white/60 text-xs mb-1">Confirmar nova senha</label>
      <input
        type="password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
      />

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      {success && <p className="text-primary text-xs mb-3">Senha atualizada!</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 rounded-lg bg-primary text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); setSuccess(false); }}
          className="px-4 py-2 rounded-lg text-white/40 hover:text-white text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
