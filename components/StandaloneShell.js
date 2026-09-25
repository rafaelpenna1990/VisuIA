'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';
import AuthGate from './AuthGate';
import TopUpModal from './TopUpModal';
import SubscriptionModal from './SubscriptionModal';
import { formatTokens } from '../lib/tokens.js';
import { useAssetsVersion } from '../lib/useAssetsVersion.js';
import Logo from './Logo';
import { resumePendingJob, getPendingJob } from 'studio/src/api-client.js';

const TABS = [
  {
    id: 'image', label: 'Imagem',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    id: 'video', label: 'Vídeo',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 'lipsync', label: 'Sincronia Labial',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      </svg>
    ),
  },
  {
    id: 'cinema', label: 'Cinema',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
];

export default function StandaloneShell() {
  const assetsVersion = useAssetsVersion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = TABS.map((t) => t.id);
  const initialTab = validTabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'image';

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(null); // null = not checked yet
  const [hasMounted, setHasMounted] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    setUser(data.user);
  }, []);

  // Checked lazily, right before we'd actually need it (when a generation
  // gets blocked for insufficient credits) — no point calling this on
  // every page load for people who never hit that wall.
  const checkSubscription = useCallback(async () => {
    if (hasSubscription !== null) return hasSubscription;
    try {
      const res = await fetch('/api/billing/subscription', { credentials: 'include' });
      const data = await res.json();
      const active = !!data.subscription;
      setHasSubscription(active);
      return active;
    } catch {
      return false;
    }
  }, [hasSubscription]);

  // The single trigger every studio calls when a generation is blocked for
  // insufficient credits: someone who already pays gets sent straight to
  // "buy more tokens"; someone who doesn't yet gets sent to "pick a plan"
  // instead, since that's almost always the better fit for them.
  const handleInsufficientCredits = useCallback(async () => {
    const active = await checkSubscription();
    if (active) {
      setShowTopUp(true);
    } else {
      setShowSubscribePrompt(true);
    }
  }, [checkSubscription]);

  useEffect(() => {
    refreshUser().finally(() => setHasMounted(true));
  }, [refreshUser]);

  // If a generation was left running when the page was closed/refreshed
  // (the money was already pre-charged and the job is still going on
  // Muapi's side), pick it back up so the credit gets settled correctly
  // and the result isn't lost.
  useEffect(() => {
    if (!getPendingJob()) return;
    setResuming(true);
    resumePendingJob()
      .then((result) => {
        if (result) {
          window.alert(
            `Sua geração anterior (${result.kind}) terminou enquanto você estava fora!\n\nLink: ${result.url}`
          );
        }
      })
      .catch((err) => {
        window.alert(`Não foi possível recuperar sua geração anterior: ${err.message}`);
      })
      .finally(() => {
        setResuming(false);
        refreshUser();
      });
  }, [refreshUser]);

  // Refresh balance whenever the tab regains focus (e.g. after a generation
  // or after coming back from the Stripe checkout tab, or the account page).
  useEffect(() => {
    const onFocus = () => refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

  if (!hasMounted) return (
    <div className="min-h-screen bg-[#080910] flex items-center justify-center">
      <div className="animate-spin text-[#FF9500] text-3xl">◌</div>
    </div>
  );

  if (!user) {
    return <AuthGate onAuthenticated={setUser} />;
  }

  // The studio components still take an `apiKey` prop, but api-client.js
  // ignores it — the real Muapi key lives only on the server now. Any
  // non-empty placeholder keeps their existing prop checks happy.
  const placeholderKey = 'server-managed';

  return (
    <div className="h-screen bg-[#080910] flex overflow-hidden">
      {/* Mobile top bar — hidden on desktop, where the sidebar is always visible */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-[#0F1119] border-b border-white/5 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="text-white/70 hover:text-white p-1 -ml-1"
          aria-label="Abrir menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button onClick={() => router.push('/')}>
          <Logo version={assetsVersion} className="h-7 w-auto max-w-[120px]" />
        </button>
        <button
          onClick={() => setShowTopUp(true)}
          className="text-[#FF9500] text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[#FF9500]/10"
        >
          {formatTokens(user.credits_balance)}
        </button>
      </div>

      {/* Backdrop — only rendered while the mobile drawer is open */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — a slide-in drawer on mobile, a normal fixed column on desktop */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-60 shrink-0 bg-[#0F1119] border-r border-white/5 flex flex-col py-6 px-4 transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden self-end text-white/40 hover:text-white mb-2"
          aria-label="Fechar menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="mb-8 px-2">
          <button onClick={() => router.push('/')} className="block">
            <Logo version={assetsVersion} className="h-12 w-auto max-w-full" />
          </button>
          {resuming && (
            <div className="text-[10px] text-white/40 flex items-center gap-1.5 mt-1">
              <span className="animate-spin inline-block">◌</span>
              Retomando geração…
            </div>
          )}
        </div>

        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 mb-2">
          Estúdios
        </div>
        <nav className="flex flex-col gap-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${
                activeTab === tab.id
                  ? 'bg-[#FF9500] text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <button
            onClick={() => router.push('/conta?tab=projetos')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors text-left"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Meus Projetos
          </button>
          <button
            onClick={() => setShowTopUp(true)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[#FF9500] bg-[#FF9500]/10 hover:bg-[#FF9500]/20 transition-colors"
          >
            {formatTokens(user.credits_balance)}
          </button>
          <button
            onClick={() => router.push('/conta')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors text-left"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Conta
          </button>
        </div>
      </aside>

      {/* Studio Content */}
      <div className="flex-1 min-w-0 pt-14 md:pt-0">
        {activeTab === 'image'   && <ImageStudio   apiKey={placeholderKey} onGenerationComplete={refreshUser} onInsufficientCredits={handleInsufficientCredits} />}
        {activeTab === 'video'   && <VideoStudio   apiKey={placeholderKey} onGenerationComplete={refreshUser} onInsufficientCredits={handleInsufficientCredits} />}
        {activeTab === 'lipsync' && <LipSyncStudio apiKey={placeholderKey} onGenerationComplete={refreshUser} onInsufficientCredits={handleInsufficientCredits} />}
        {activeTab === 'cinema'  && <CinemaStudio  apiKey={placeholderKey} onGenerationComplete={refreshUser} onInsufficientCredits={handleInsufficientCredits} />}
      </div>

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
      {showSubscribePrompt && (
        <SubscriptionModal
          onClose={() => setShowSubscribePrompt(false)}
          onBuyWithoutSubscription={() => { setShowSubscribePrompt(false); setShowTopUp(true); }}
        />
      )}
    </div>
  );
}
