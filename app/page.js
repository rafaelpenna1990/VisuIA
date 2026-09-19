'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '../components/AuthModal';

const FEATURES = [
  {
    id: 'image',
    title: 'Imagem',
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
  const [prompt, setPrompt] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup'

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
      router.push('/studio');
    } else {
      setAuthModal(mode);
    }
  };

  const startGenerating = (e) => {
    e.preventDefault();
    goToStudioOrAuth('signup');
  };

  const handleAuthenticated = (user, mode) => {
    setAuthModal(null);
    // First-time signup → straight to plan options; a plain login just
    // wants back into the studio.
    router.push(mode === 'signup' ? '/conta?tab=assinatura' : '/studio');
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
      <section className="px-6 md:px-10 pt-10 md:pt-20 pb-20 max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] tracking-tight mb-6">
            Sua ideia vira imagem,<br />
            vídeo ou cena de cinema<br />
            <span className="text-primary">em segundos.</span>
          </h1>
          <p className="text-white/60 text-base md:text-lg leading-relaxed mb-10 max-w-xl">
            A VisuIA transforma um texto simples em conteúdo visual pronto pra usar:
            imagem, vídeo, sincronia labial ou efeitos de cinema, tudo num só lugar,
            sem precisar de software caro.
          </p>

          {/* Prompt starter */}
          <form onSubmit={startGenerating} className="w-full max-w-xl">
            <div className="flex flex-col sm:flex-row gap-3 bg-card-bg border border-white/10 rounded-2xl p-2 sm:p-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva o que você quer criar..."
                className="flex-1 bg-transparent px-4 py-3 text-sm md:text-base text-white placeholder:text-white/30 outline-none"
              />
              <button
                type="submit"
                className="bg-primary hover:opacity-90 text-black font-bold text-sm px-6 py-3 rounded-xl transition-opacity shadow-glow"
              >
                Gerar
              </button>
            </div>
            <p className="text-white/30 text-xs mt-3">
              Grátis pra testar, sem cartão de crédito
            </p>
          </form>
        </div>
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
              <div
                key={f.id}
                className="bg-panel-bg border border-white/10 rounded-2xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
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
    </div>
  );
}
