'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '../components/AuthModal';
import SubscriptionModal from '../components/SubscriptionModal';
import TopUpModal from '../components/TopUpModal';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';

const FEATURES = [
  {
    id: 'image',
    title: 'Imagem',
    desc: 'Crie imagens do zero a partir de uma descrição, ou edite fotos que você já tem: troque fundo, estilo, roupa, iluminação.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    id: 'video',
    title: 'Vídeo',
    desc: 'Anime uma foto parada, ou descreva uma cena em texto e receba um vídeo curto pronto pra postar.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 'lipsync',
    title: 'Sincronia Labial',
    desc: 'Sincronize um áudio com um retrato ou vídeo, e a boca acompanha a fala automaticamente.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      </svg>
    ),
  },
  {
    id: 'cinema',
    title: 'Cinema',
    desc: 'Aplique lentes e câmeras de cinema de verdade nas suas cenas, do 16mm vintage ao digital 8K.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
];

const MODEL_HIGHLIGHTS = {
  image: [
    { name: 'Nano Banana', desc: 'Edita fotos existentes mantendo o rosto e a identidade da pessoa.' },
    { name: 'Flux', desc: 'Cria imagens do zero com alta qualidade e riqueza de detalhes.' },
    { name: 'Midjourney v7', desc: 'Visual artístico, ideal pra ilustrações e composições criativas.' },
  ],
  video: [
    { name: 'Kling', desc: 'Movimento fluido e realista, boa consistência de cena.' },
    { name: 'Veo 3', desc: 'Gera o vídeo já com áudio sincronizado.' },
    { name: 'Sora 2', desc: 'Cenas complexas com física e iluminação realistas.' },
    { name: 'Seedance', desc: 'Geração rápida com ótimo custo-benefício.' },
  ],
  lipsync: [
    { name: 'Sync', desc: 'Sincronização labial precisa a partir de qualquer áudio.' },
    { name: 'Veed Lipsync', desc: 'Resultado natural mesmo com ângulos de rosto variados.' },
    { name: 'Infinite Talk', desc: 'Boa opção pra vídeos mais longos.' },
  ],
  cinema: [
    { name: 'Câmeras profissionais', desc: 'Do 16mm vintage ao digital 8K.' },
    { name: 'Lentes de cinema', desc: 'Anamórficas, macro, prime clássicas.' },
    { name: 'Focal e abertura', desc: 'Perspectiva e profundidade de campo sob controle.' },
  ],
};

const STEPS = [
  { n: '1', title: 'Crie sua conta', desc: 'Cadastro rápido, e você já começa com créditos grátis pra testar.' },
  { n: '2', title: 'Descreva o que você quer', desc: 'Um texto simples já basta. Escolha o modelo e o formato.' },
  { n: '3', title: 'Baixe e use', desc: 'Em segundos você tem o arquivo pronto, sem marca d\u2019água.' },
];

// Small dropdown wrapper used by the 3 nav menus below.
function NavDropdown({ label, isOpen, onToggle, children, panelClassName }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-sm font-semibold transition-colors px-2 py-1 ${
          isOpen ? 'text-primary' : 'text-white/70 hover:text-white'
        }`}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && (
        <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-[#150E1C] border border-white/10 rounded-2xl shadow-3xl z-50 ${panelClassName || 'w-80'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('image');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup'
  const [showSubModal, setShowSubModal] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [openNav, setOpenNav] = useState(null); // null | 'create' | 'models' | 'how'
  const navRef = useRef(null);

  // Check session once on load so an already-logged-in visitor skips the
  // popup entirely and goes straight to the studio.
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setIsLoggedIn(!!data.user))
      .catch(() => {});
  }, []);

  // Close nav dropdowns on outside click.
  useEffect(() => {
    if (!openNav) return;
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenNav(null);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [openNav]);

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

  const toggleNav = (id) => (e) => {
    e.stopPropagation();
    setOpenNav((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-app-bg text-white">
      {/* Header */}
      <header ref={navRef} className="flex items-center justify-between px-6 md:px-10 py-5 max-w-6xl mx-auto relative">
        <div className="flex items-center gap-8">
          <span className="font-black text-lg tracking-wider uppercase">VisuIA</span>

          <nav className="hidden md:flex items-center gap-6">
            <NavDropdown label="O que você pode criar" isOpen={openNav === 'create'} onToggle={toggleNav('create')}>
              <div className="p-3">
                {FEATURES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => { setSelectedType(f.id); setOpenNav(null); }}
                    className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">{f.title}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </NavDropdown>

            <NavDropdown label="Os modelos por trás da mágica" isOpen={openNav === 'models'} onToggle={toggleNav('models')} panelClassName="w-[420px]">
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {FEATURES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedType(f.id); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        selectedType === f.id ? 'bg-primary text-black' : 'bg-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      {f.title}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  {MODEL_HIGHLIGHTS[selectedType].map((m) => (
                    <div key={m.name} className="p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <p className="text-sm font-bold text-primary mb-0.5">{m.name}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </NavDropdown>

            <NavDropdown label="Como funciona" isOpen={openNav === 'how'} onToggle={toggleNav('how')} panelClassName="w-72">
              <div className="p-3">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex items-start gap-3 p-3">
                    <div className="w-7 h-7 shrink-0 rounded-full border-2 border-primary text-primary flex items-center justify-center font-black text-xs">
                      {s.n}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">{s.title}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </NavDropdown>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => goToStudioOrAuth('login')}
            className="text-sm font-semibold text-white/70 hover:text-white transition-colors px-2"
          >
            Entrar
          </button>
          <button
            onClick={() => goToStudioOrAuth('signup')}
            className="bg-primary hover:opacity-90 text-black font-bold text-sm px-5 py-2 rounded-full transition-opacity"
          >
            Cadastrar
          </button>
        </div>
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

        {/* Live studio preview — the real controls, so people see exactly
            what they'll get. Logged-out visitors can look and click
            around, but any click opens the signup modal instead of
            actually generating — the studios underneath still require a
            real session to call /api/generate. */}
        <div
          className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-black"
          style={{ height: 'min(75vh, 780px)', minHeight: '540px' }}
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
