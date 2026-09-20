'use client';

import { notFound } from 'next/navigation';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';
import { findFeatureBySlug } from '../../../lib/landing-data.js';
import { useAuthFlow } from '../../../lib/useAuthFlow.js';
import SiteHeader from '../../../components/SiteHeader';
import SiteFooter from '../../../components/SiteFooter';
import AuthFlowModals from '../../../components/AuthFlowModals';
import BackgroundCarousel from '../../../components/BackgroundCarousel';

const STUDIO_BY_ID = {
  image: ImageStudio,
  video: VideoStudio,
  lipsync: LipSyncStudio,
  cinema: CinemaStudio,
};

export default function CriarTypePage({ params }) {
  const feature = findFeatureBySlug(params.slug);
  const auth = useAuthFlow(feature?.id);

  if (!feature) return notFound();

  const StudioComponent = STUDIO_BY_ID[feature.id];

  return (
    <div className="min-h-screen bg-app-bg text-white relative">
      <div className="relative z-10">
        <SiteHeader goToStudioOrAuth={auth.goToStudioOrAuth} />

        <section className="relative px-6 md:px-10 pt-6 md:pt-8 pb-16 max-w-6xl mx-auto overflow-hidden">
          <BackgroundCarousel slug={feature.slug} />
          <div className="relative z-10">
            <div className="max-w-3xl">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight mb-3">
                {feature.tagline}
              </h1>
              <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8 max-w-xl">
                {feature.longDesc}
              </p>
            </div>

            <div
              className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-black"
              style={{ height: 'min(75vh, 780px)', minHeight: '540px' }}
            >
              <StudioComponent apiKey="preview" />
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
          </div>
        </section>

        <SiteFooter />
      </div>
      <AuthFlowModals auth={auth} />
    </div>
  );
}
