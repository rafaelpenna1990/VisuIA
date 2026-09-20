'use client';

import { useState } from 'react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';
import { FEATURES } from '../lib/landing-data.js';
import { useAuthFlow } from '../lib/useAuthFlow.js';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import AuthFlowModals from '../components/AuthFlowModals';

export default function LandingPage() {
  const [selectedType, setSelectedType] = useState('image');
  const auth = useAuthFlow(selectedType);

  return (
    <div className="min-h-screen bg-app-bg text-white">
      <SiteHeader goToStudioOrAuth={auth.goToStudioOrAuth} />

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
            actually generating. */}
        <div
          className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-black"
          style={{ height: 'min(75vh, 780px)', minHeight: '540px' }}
        >
          {selectedType === 'image' && <ImageStudio apiKey="preview" />}
          {selectedType === 'video' && <VideoStudio apiKey="preview" />}
          {selectedType === 'lipsync' && <LipSyncStudio apiKey="preview" />}
          {selectedType === 'cinema' && <CinemaStudio apiKey="preview" />}

          {!auth.isLoggedIn && (
            <button
              type="button"
              onClick={() => auth.goToStudioOrAuth('signup')}
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
            onClick={() => auth.goToStudioOrAuth('signup')}
            className="shrink-0 bg-primary hover:opacity-90 text-black font-bold text-sm px-8 py-3.5 rounded-xl transition-opacity shadow-glow"
          >
            Criar conta grátis
          </button>
        </div>
      </section>

      <SiteFooter />
      <AuthFlowModals auth={auth} />
    </div>
  );
}
