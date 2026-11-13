'use client';

import Link from 'next/link';
import { useTranslation } from '../lib/i18n/useTranslation.js';
import { COMPANY } from '../lib/companyInfo.js';

export default function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="px-6 md:px-10 py-10 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 text-white/30 text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} VisuIA</span>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/termos" className="hover:text-white/70 transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-white/70 transition-colors">Privacidade</Link>
            <Link href="/reembolso" className="hover:text-white/70 transition-colors">Reembolso</Link>
            <a href={`mailto:${COMPANY.supportEmail}`} className="hover:text-white/70 transition-colors">{COMPANY.supportEmail}</a>
          </nav>
          <span>{t('footer.madeInBrazil')}</span>
        </div>
        <p className="text-center text-white/20">
          {COMPANY.legalName} · CNPJ {COMPANY.cnpj}
        </p>
      </div>
    </footer>
  );
}
