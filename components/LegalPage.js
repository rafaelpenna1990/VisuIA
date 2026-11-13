'use client';

import { useAuthFlow } from '../lib/useAuthFlow.js';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import AuthFlowModals from './AuthFlowModals';
import { LEGAL_UPDATED } from '../lib/companyInfo.js';

export default function LegalPage({ doc }) {
  const auth = useAuthFlow('image');
  return (
    <div className="min-h-screen bg-app-bg text-white">
      <SiteHeader goToStudioOrAuth={auth.goToStudioOrAuth} isLoggedIn={auth.isLoggedIn} />

      <article className="px-6 md:px-10 pt-6 md:pt-8 pb-16 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight mb-2">{doc.title}</h1>
        <p className="text-white/40 text-xs mb-6">Última atualização: {LEGAL_UPDATED}</p>
        <p className="text-white/70 text-sm md:text-base leading-relaxed mb-10">{doc.intro}</p>

        <div className="flex flex-col gap-8">
          {doc.sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-bold text-lg md:text-xl mb-3">{section.title}</h2>
              <div className="flex flex-col gap-3">
                {section.body.map((block, i) =>
                  typeof block === 'string' ? (
                    <p key={i} className="text-white/60 text-sm md:text-base leading-relaxed">{block}</p>
                  ) : (
                    <ul key={i} className="list-disc pl-5 flex flex-col gap-2">
                      {block.list.map((item) => (
                        <li key={item} className="text-white/60 text-sm md:text-base leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </article>

      <SiteFooter />
      <AuthFlowModals auth={auth} />
    </div>
  );
}
