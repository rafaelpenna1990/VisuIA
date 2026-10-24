'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocalizedFeatures } from '../lib/i18n/useLocalizedContent.js';
import { useTranslation } from '../lib/i18n/useTranslation.js';
import { useAuthFlow } from '../lib/useAuthFlow.js';
import { useHeroContent, HighlightedText } from '../lib/useHeroContent.js';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import AuthFlowModals from '../components/AuthFlowModals';
import VideoBackdrop from '../components/VideoBackdrop';
import ExampleFan from '../components/ExampleFan';
import SiteSidebar from '../components/SiteSidebar';

// Each studio (and the model catalog it pulls in, e.g. models.js at ~260KB)
// now only downloads when that tab is actually opened, instead of all four
// shipping together to every anonymous visitor who just lands on the home
// page. Same component, same props, same behavior — this only changes WHEN
// the code is fetched, so it's safe to ship without touching anyone's flow.
const studioLoading = (
  <div className="w-full h-full flex items-center justify-center">
    <span className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);
const ImageStudio = dynamic(() => import('studio').then((m) => m.ImageStudio), {
  ssr: false,
  loading: () => studioLoading,
});
const VideoStudio = dynamic(() => import('studio').then((m) => m.VideoStudio), {
  ssr: false,
  loading: () => studioLoading,
});
const LipSyncStudio = dynamic(() => import('studio').then((m) => m.LipSyncStudio), {
  ssr: false,
  loading: () => studioLoading,
});
const CinemaStudio = dynamic(() => import('studio').then((m) => m.CinemaStudio), {
  ssr: false,
  loading: () => studioLoading,
});

export default function LandingPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('image');
  const auth = useAuthFlow(selectedType);
  const { t } = useTranslation();
  const FEATURES = useLocalizedFeatures();
  const currentSlug = FEATURES.find((f) => f.id === selectedType)?.slug || 'imagem';
  const hero = useHeroContent();

  return (
    <div className="relative h-screen bg-black text-white md:flex overflow-hidden">
      <VideoBackdrop variant="hero" />
      <div className="relative z-10 h-screen w-full md:flex">
      <SiteSidebar selectedType={selectedType} onSelectType={setSelectedType} />

      <div className="flex-1 min-w-0 h-screen flex flex-col">
        {/* Barra do topo (computador): links e entrada no canto direito */}
        <div className="hidden md:flex h-14 shrink-0 items-center justify-end gap-5 pr-6">
          <button
            type="button"
            onClick={() => router.push('/como-funciona')}
            className="text-sm font-semibold text-white/70 hover:text-white transition-colors"
          >
            {t('header.navHow')}
          </button>
          {auth.isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={() => router.push('/conta')}
                className="text-sm font-semibold text-white/70 hover:text-white transition-colors"
              >
                {t('header.myAccount')}
              </button>
              <button
                type="button"
                onClick={() => auth.goToStudioOrAuth('login')}
                className="bg-primary hover:opacity-90 text-black font-bold text-sm px-5 py-2 rounded-full transition-opacity"
              >
                {t('header.myStudio')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => auth.goToStudioOrAuth('login')}
                className="text-sm font-semibold text-white/70 hover:text-white transition-colors"
              >
                {t('header.login')}
              </button>
              <button
                type="button"
                onClick={() => auth.goToStudioOrAuth('signup')}
                className="bg-primary hover:opacity-90 text-black font-bold text-sm px-5 py-2 rounded-full transition-opacity"
              >
                {t('home.startFreeNow')}
              </button>
            </>
          )}
        </div>

        {/* Painel arredondado, afastado das bordas, com o vídeo suave dentro */}
        <div className="relative flex-1 min-h-0">
          <div className="relative h-full overflow-y-auto custom-scrollbar">
            {/* No celular o menu completo continua sendo o cabeçalho de antes */}
            <div className="md:hidden">
              <SiteHeader goToStudioOrAuth={auth.goToStudioOrAuth} isLoggedIn={auth.isLoggedIn} />
            </div>

            {/* Hero */}
            <section className="px-6 md:px-10 pt-8 md:pt-12 pb-16 max-w-5xl mx-auto">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black leading-[1.05] tracking-tight mb-4 [text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
                  <HighlightedText text={hero.title} />
                </h1>
                <p className="text-white/85 text-sm md:text-lg leading-relaxed mb-8 max-w-xl mx-auto [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
                  {hero.subtitle}
                </p>
              </div>

              <ExampleFan slug={currentSlug} />

              {/* Abas só no celular — no computador a escolha fica na barra lateral */}
              <div className="md:hidden flex items-center justify-center gap-2 mb-5 flex-wrap">
                {FEATURES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedType(f.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                      selectedType === f.id
                        ? 'bg-primary text-black'
                        : 'bg-white/5 backdrop-blur text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    {f.title}
                  </button>
                ))}
              </div>

              {/* Estúdio de verdade: dá para digitar e mexer nas opções. Só o
                  botão Gerar abre o cadastro (onAuthRequired). Cada estúdio
                  é carregado só quando aberto (dynamic acima). */}
              <div
                className="relative w-full"
                style={{ height: '250px' }}
              >
                {selectedType === 'image' && <ImageStudio minimal hideTemplates apiKey="preview" onAuthRequired={auth.isLoggedIn ? undefined : () => auth.goToStudioOrAuth('signup')} />}
                {selectedType === 'video' && <VideoStudio minimal hideTemplates apiKey="preview" onAuthRequired={auth.isLoggedIn ? undefined : () => auth.goToStudioOrAuth('signup')} />}
                {selectedType === 'lipsync' && <LipSyncStudio minimal hideTemplates apiKey="preview" onAuthRequired={auth.isLoggedIn ? undefined : () => auth.goToStudioOrAuth('signup')} />}
                {selectedType === 'cinema' && <CinemaStudio minimal hideTemplates apiKey="preview" onAuthRequired={auth.isLoggedIn ? undefined : () => auth.goToStudioOrAuth('signup')} />}
              </div>


            </section>

            {/* Preço: só texto, sem caixa */}
            <section className="px-6 md:px-10 pt-40 pb-16 text-center bg-gradient-to-b from-transparent via-black/70 to-black">
              <h2 className="text-xl md:text-2xl font-black mb-2">{t('home.payOnlyTitle')}</h2>
              <p className="text-white/50 text-sm md:text-base max-w-md mx-auto mb-6">
                {t('home.payOnlyDesc')}
              </p>
              <button
                onClick={() => auth.goToStudioOrAuth('signup')}
                className="bg-primary hover:opacity-90 text-black font-bold text-sm px-8 py-3 rounded-full transition-opacity"
              >
                {t('home.startFreeNow')}
              </button>
            </section>

            <SiteFooter />
          </div>
        </div>
      </div>

      </div>
      <AuthFlowModals auth={auth} />
    </div>
  );
}
