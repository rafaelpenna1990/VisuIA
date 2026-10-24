'use client';

import { useRouter } from 'next/navigation';
import { useAssetsVersion } from '../lib/useAssetsVersion.js';
import { useTranslation } from '../lib/i18n/useTranslation.js';
import { useLocalizedFeatures } from '../lib/i18n/useLocalizedContent.js';
import Logo from './Logo';

const homeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" />
  </svg>
);
const helpIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
  </svg>
);

function Item({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors text-left ${
        active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </button>
  );
}

// Barra lateral do site público (computador). Mesma ideia da barra do
// estúdio logado: Início, uma seção "Gerar" com cada tipo de criação e
// uma seção "Explorar" com as páginas de apoio.
export default function SiteSidebar({ selectedType, onSelectType }) {
  const router = useRouter();
  const assetsVersion = useAssetsVersion();
  const { t } = useTranslation();
  const FEATURES = useLocalizedFeatures();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col py-5 px-4 h-screen">
      <button type="button" onClick={() => router.push('/')} className="block px-3 mb-6 mt-1 self-start">
        <Logo version={assetsVersion} className="h-10 w-auto max-w-full" />
      </button>

      <Item icon={homeIcon} label="Início" active onClick={() => router.push('/')} />

      <div className="text-[11px] font-semibold text-white/35 px-3 mt-6 mb-2">Gerar</div>
      <nav className="flex flex-col gap-0.5">
        {FEATURES.map((f) => (
          <Item
            key={f.id}
            icon={f.icon}
            label={f.title}
            active={selectedType === f.id}
            onClick={() => onSelectType(f.id)}
          />
        ))}
      </nav>

      <div className="text-[11px] font-semibold text-white/35 px-3 mt-6 mb-2">Explorar</div>
      <nav className="flex flex-col gap-0.5">
        <Item icon={helpIcon} label={t('header.navHow')} onClick={() => router.push('/como-funciona')} />
      </nav>
    </aside>
  );
}
