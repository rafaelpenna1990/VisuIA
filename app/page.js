'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '../components/AuthModal';
import SubscriptionModal from '../components/SubscriptionModal';
import TopUpModal from '../components/TopUpModal';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';

const FEATURES = [
  {
    id: 'image',
    title: 'Imagem',
    placeholder: 'Descreva a imagem que você quer criar...',
    desc: 'Crie imagens do zero a partir de uma descrição, ou edite fotos que você já tem: troque fundo, estilo, roupa, iluminação.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    id: 'video',
    title: 'Vídeo',
    placeholder: 'Descreva o vídeo que você quer criar...',
    desc: 'Anime uma foto parada, ou descreva uma cena em texto e receba um vídeo curto pronto pra postar.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 'lipsync',
    title: 'Sincronia Labial',
    placeholder: 'Envie um áudio e um retrato pra sincronizar...',
    desc: 'Sincronize um áudio com um retrato ou vídeo, e a boca acompanha a fala automaticamente.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      </svg>
    ),
  },
  {
    id: 'cinema',
    title: 'Cinema',
    placeholder: 'Descreva a cena que você quer filmar...',
    desc: 'Aplique lentes e câmeras de cinema de verdade nas suas cenas, do 16mm vintage ao digital 8K.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Crie sua conta',
    desc: 'Cadastro rápido, sem burocracia, e você já começa com créditos grátis pra testar.',
  },
  {
    n: '2',
    title: 'Descreva o que você quer',
    desc: 'Um texto simples já basta. Escolha o modelo, o formato, e deixa a IA trabalhar.',
  },
  {
    n: '3',
    title: 'Baixe e use',
    desc: 'Em segundos você tem o arquivo pronto, sem marca d\u2019água, seu pra usar onde quiser.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('image');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup'
  const [showSubModal, setShowSubModal] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  // Check session once on load so an already-logged-in visitor skips the
  // popup entirely and goes straight to the studio.
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setIsLoggedIn(!!data.user))
      .catch(() => {});
  }, []);

  const goToStudioOrAuth = (mode) => {
    if (isLoggedIn) {
      router.push(`/studio?tab=${selectedType}`);
    } else {
      setAuthModal(mode);
    }
  };

  const handleAuthenticated = (user, mode) => {
    setAuthModal(null);
    // First-time signup → show the plan popup right here; a plain login
    // just wants back into the studio, on the type they were browsing.
    if (mode === 'signup') {
      setShowSubModal(true);
    } else {
      router.push(`/studio?tab=${selectedType}`);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 max-w-6xl mx-auto">
        <span className="font-black text-lg tracking-wider uppercase">VisuIA</span>
        <button
          onClick={() => goToStudioOrAuth('login')}
          className="text-sm font-semibold text-white/70 hover:text-white transition-colors"
        >
          Entrar
        </button>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-10 pt-6 md:pt-8 pb-20 max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight mb-3">
            Sua ideia vira imagem, vídeo ou cena de cinema{' '}
            <span className="text-primary">em segundos.</span>
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed mb-5 max-w-xl">
            Escolha abaixo o que você quer criar e já comece a mexer nas opções —
            sem precisar de software caro.
          </p>
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedType(f.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-colors ${
                selectedType === f.id
                  ? 'bg-primary text-black'
                  : 'bg-card-bg text-white/50 hover:text-white border border-white/10'
              }`}
            >
              {f.title}
            </button>
          ))}
        </div>

        {/* Live studio preview — the real controls (model, duração, resolução
            etc.), so people see exactly what they'll get. Logged-out
            visitors can look and click around, but any click opens the
            signup modal instead of actually generating — the studios
            underneath still require a real session to call /api/generate. */}
        <div
          className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-black"
          style={{ height: 'min(78vh, 820px)', minHeight: '560px' }}
        >
          {selectedType === 'image' && <ImageStudio apiKey="preview" />}
          {selectedType === 'video' && <VideoStudio apiKey="preview" />}
          {selectedType === 'lipsync' && <LipSyncStudio apiKey="preview" />}
          {selectedType === 'cinema' && <CinemaStudio apiKey="preview" />}

          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => goToStudioOrAuth('signup')}
              className="absolute inset-0 z-50 cursor-pointer bg-transparent"
              aria-label="Criar conta para gerar"
            />
          )}
        </div>
        <p className="text-white/30 text-xs mt-3">
          Grátis pra testar, sem cartão de crédito
        </p>
      </section>

      {/* Features */}
      <section className="px-6 md:px-10 py-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black mb-3">O que você pode criar</h2>
          <p className="text-white/50 text-sm md:text-base mb-10 max-w-lg">
            Quatro estúdios, um único lugar. Escolha o que sua ideia precisa.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setSelectedType(f.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`text-left bg-panel-bg border rounded-2xl p-6 transition-colors ${
                  selectedType === f.id ? 'border-primary/50' : 'border-white/10 hover:border-primary/30'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-10 py-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black mb-10">Como funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center font-black text-sm mb-4">
                  {s.n}
                </div>
                <h3 className="font-bold text-base mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing blurb */}
      <section className="px-6 md:px-10 py-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto bg-panel-bg border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl font-black mb-2">Pague só pelo que gerar</h2>
            <p className="text-white/50 text-sm md:text-base max-w-md">
              Sem mensalidade obrigatória. Compra VisuTokens quando precisar, e cada geração
              debita só o valor exato dela.
            </p>
          </div>
          <button
            onClick={() => goToStudioOrAuth('signup')}
            className="shrink-0 bg-primary hover:opacity-90 text-black font-bold text-sm px-8 py-3.5 rounded-xl transition-opacity shadow-glow"
          >
            Criar conta grátis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-white/30 text-xs">
          <span>© {new Date().getFullYear()} VisuIA</span>
          <span>Feito no Brasil</span>
        </div>
      </footer>

      {authModal && (
        <AuthModal
          initialMode={authModal}
          onAuthenticated={handleAuthenticated}
          onClose={() => setAuthModal(null)}
        />
      )}

      {showSubModal && (
        <SubscriptionModal
          onClose={() => { setShowSubModal(false); router.push(`/studio?tab=${selectedType}`); }}
          onBuyWithoutSubscription={() => { setShowSubModal(false); setShowTopUp(true); }}
        />
      )}

      {showTopUp && (
        <TopUpModal onClose={() => { setShowTopUp(false); router.push(`/studio?tab=${selectedType}`); }} />
      )}
    </div>
  );
}
