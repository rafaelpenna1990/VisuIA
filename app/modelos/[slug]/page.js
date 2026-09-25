'use client';

import { notFound } from 'next/navigation';
import { useLocalizedFeature, useLocalizedModelHighlights } from '../../../lib/i18n/useLocalizedContent.js';
import { useTranslation } from '../../../lib/i18n/useTranslation.js';
import { useAuthFlow } from '../../../lib/useAuthFlow.js';
import { usePromoText } from '../../../lib/usePromoText.js';
import SiteHeader from '../../../components/SiteHeader';
import SiteFooter from '../../../components/SiteFooter';
import AuthFlowModals from '../../../components/AuthFlowModals';

export default function ModelosTypePage({ params }) {
  const feature = useLocalizedFeature(params.slug);
  const auth = useAuthFlow(feature?.id);
  const promoText = usePromoText();
  const { t } = useTranslation();
  const MODEL_HIGHLIGHTS = useLocalizedModelHighlights();

  if (!feature) return notFound();

  const models = MODEL_HIGHLIGHTS[feature.id] || [];

  return (
    <div className="min-h-screen bg-app-bg text-white">
      <SiteHeader goToStudioOrAuth={auth.goToStudioOrAuth} isLoggedIn={auth.isLoggedIn} />

      <section className="px-6 md:px-10 pt-6 md:pt-8 pb-16 max-w-6xl mx-auto">
        <div className="max-w-3xl mb-10">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            {feature.icon}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight mb-3">
            {t('modelos.titlePrefix')} {feature.title}
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-xl">
            {t('modelos.descPrefix')} {feature.title.toLowerCase()} {t('modelos.descSuffix')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {models.map((m) => (
            <div key={m.name} className="bg-panel-bg border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-base mb-2 text-primary">{m.name}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
            {promoText}
          </span>
        </div>
        <button
          onClick={() => auth.goToStudioOrAuth('signup')}
          className="bg-primary hover:opacity-90 text-black font-bold text-sm px-8 py-3.5 rounded-xl transition-opacity shadow-glow"
        >
          {t('modelos.createFreeAccount')}
        </button>
      </section>

      <SiteFooter />
      <AuthFlowModals auth={auth} />
    </div>
  );
}
