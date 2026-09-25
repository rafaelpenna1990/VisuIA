'use client';

import { useLocalizedSteps } from '../../lib/i18n/useLocalizedContent.js';
import { useTranslation } from '../../lib/i18n/useTranslation.js';
import { useAuthFlow } from '../../lib/useAuthFlow.js';
import { usePromoText } from '../../lib/usePromoText.js';
import SiteHeader from '../../components/SiteHeader';
import SiteFooter from '../../components/SiteFooter';
import AuthFlowModals from '../../components/AuthFlowModals';

export default function ComoFuncionaPage() {
  const auth = useAuthFlow('image');
  const promoText = usePromoText();
  const { t } = useTranslation();
  const STEPS = useLocalizedSteps();

  return (
    <div className="min-h-screen bg-app-bg text-white">
      <SiteHeader goToStudioOrAuth={auth.goToStudioOrAuth} isLoggedIn={auth.isLoggedIn} />

      <section className="px-6 md:px-10 pt-6 md:pt-8 pb-16 max-w-6xl mx-auto">
        <div className="max-w-2xl mb-12">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight mb-3">
            {t('comoFunciona.title')}
          </h1>
          <p className="text-white/60 text-sm md:text-base leading-relaxed">
            {t('comoFunciona.subtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-10 max-w-2xl">
          {STEPS.map((s) => (
            <div key={s.n} id={s.slug} className="flex items-start gap-5 scroll-mt-24">
              <div className="w-12 h-12 shrink-0 rounded-full border-2 border-primary text-primary flex items-center justify-center font-black text-lg">
                {s.n}
              </div>
              <div>
                <h2 className="font-bold text-xl mb-2">{s.title}</h2>
                <p className="text-white/50 text-sm md:text-base leading-relaxed">{s.longDesc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-12 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
            {promoText}
          </span>
        </div>
        <button
          onClick={() => auth.goToStudioOrAuth('signup')}
          className="bg-primary hover:opacity-90 text-black font-bold text-sm px-8 py-3.5 rounded-xl transition-opacity shadow-glow"
        >
          {t('comoFunciona.createFreeAccount')}
        </button>
      </section>

      <SiteFooter />
      <AuthFlowModals auth={auth} />
    </div>
  );
}
