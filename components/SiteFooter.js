'use client';

import { useTranslation } from '../lib/i18n/useTranslation.js';

export default function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="px-6 md:px-10 py-10 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-white/30 text-xs">
        <span>© {new Date().getFullYear()} VisuIA</span>
        <span>{t('footer.madeInBrazil')}</span>
      </div>
    </footer>
  );
}
