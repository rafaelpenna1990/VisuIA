'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAssetsVersion } from '../lib/useAssetsVersion.js';
import { useLocalizedFeatures, useLocalizedSteps } from '../lib/i18n/useLocalizedContent.js';
import { useTranslation } from '../lib/i18n/useTranslation.js';
import Logo from './Logo';

function NavDropdown({ label, isOpen, onToggle, children, panelClassName }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-sm font-semibold transition-colors px-2 py-1 ${
          isOpen ? 'text-primary' : 'text-white/70 hover:text-white'
        }`}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && (
        <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-[#0F1119] border border-white/10 rounded-2xl shadow-3xl z-50 ${panelClassName || 'w-80'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// The nav bar used on every marketing page (home, /criar/*, /modelos/*,
// /como-funciona). Each dropdown item is a real link to its own page —
// see lib/landing-data.js for the shared copy.
export default function SiteHeader({ goToStudioOrAuth, isLoggedIn }) {
  const assetsVersion = useAssetsVersion();
  const router = useRouter();
  const { t } = useTranslation();
  const FEATURES = useLocalizedFeatures();
  const STEPS = useLocalizedSteps();
  const [openNav, setOpenNav] = useState(null); // null | 'create' | 'models' | 'how'
  const navRef = useRef(null);

  useEffect(() => {
    if (!openNav) return;
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenNav(null);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [openNav]);

  const toggleNav = (id) => (e) => {
    e.stopPropagation();
    setOpenNav((prev) => (prev === id ? null : id));
  };

  const goTo = (path) => {
    setOpenNav(null);
    router.push(path);
  };

  return (
    <header ref={navRef} className="flex items-center justify-between px-6 md:px-10 py-5 max-w-6xl mx-auto relative">
      <div className="flex items-center gap-8">
        <button onClick={() => router.push('/')} className="flex items-center">
          <Logo version={assetsVersion} className="h-14 w-auto max-w-full" />
        </button>

        <nav className="hidden md:flex items-center gap-6">
          <NavDropdown label={t('header.navCreate')} isOpen={openNav === 'create'} onToggle={toggleNav('create')}>
            <div className="p-3">
              {FEATURES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => goTo(`/criar/${f.slug}`)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-0.5">{f.title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </NavDropdown>

          <NavDropdown label={t('header.navModels')} isOpen={openNav === 'models'} onToggle={toggleNav('models')}>
            <div className="p-3">
              {FEATURES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => goTo(`/modelos/${f.slug}`)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-0.5">{f.title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{t('header.seeModelsHere')}</p>
                  </div>
                </button>
              ))}
            </div>
          </NavDropdown>

          <NavDropdown label={t('header.navHow')} isOpen={openNav === 'how'} onToggle={toggleNav('how')} panelClassName="w-72">
            <div className="p-3">
              {STEPS.map((s) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => goTo(`/como-funciona#${s.slug}`)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-7 h-7 shrink-0 rounded-full border-2 border-primary text-primary flex items-center justify-center font-black text-xs">
                    {s.n}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-0.5">{s.title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </NavDropdown>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <>
            <button
              onClick={() => router.push('/conta')}
              className="text-sm font-semibold text-white/70 hover:text-white transition-colors px-2"
            >
              {t('header.myAccount')}
            </button>
            <button
              onClick={() => goToStudioOrAuth('login')}
              className="bg-primary hover:opacity-90 text-black font-bold text-sm px-5 py-2 rounded-full transition-opacity"
            >
              {t('header.myStudio')}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => goToStudioOrAuth('login')}
              className="text-sm font-semibold text-white/70 hover:text-white transition-colors px-2"
            >
              {t('header.login')}
            </button>
            <button
              onClick={() => goToStudioOrAuth('signup')}
              className="bg-primary hover:opacity-90 text-black font-bold text-sm px-5 py-2 rounded-full transition-opacity"
            >
              {t('header.signup')}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
