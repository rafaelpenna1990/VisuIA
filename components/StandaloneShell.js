'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';
import AuthGate from './AuthGate';
import TopUpModal from './TopUpModal';
import { formatTokensCompact } from '../lib/tokens.js';
import { resumePendingJob, getPendingJob } from 'studio/src/api-client.js';

const TABS = [
  { id: 'image',   label: 'Imagem' },
  { id: 'video',   label: 'Vídeo' },
  { id: 'lipsync', label: 'Sincronia Labial' },
  { id: 'cinema',  label: 'Cinema' },
];

export default function StandaloneShell() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('image');
  const [showTopUp, setShowTopUp] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [resuming, setResuming] = useState(false);

  const refreshUser = useCallback(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    setUser(data.user);
  }, []);

  useEffect(() => {
    setHasMounted(true);
    refreshUser();
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
    <div className="min-h-screen bg-[#0D0810] flex items-center justify-center">
      <div className="animate-spin text-[#FF5A36] text-3xl">◌</div>
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
    <div className="h-screen bg-[#0D0810] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-lg tracking-wider uppercase">
            VisuIA
          </span>
          {resuming && (
            <span className="text-[10px] text-white/40 flex items-center gap-1.5">
              <span className="animate-spin inline-block">◌</span>
              Retomando geração anterior…
            </span>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#FF5A36] text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/conta?tab=projetos')}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            Meus Projetos
          </button>
          <button
            onClick={() => setShowTopUp(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#FF5A36]/10 text-[#FF5A36] hover:bg-[#FF5A36]/20 transition-colors"
          >
            {formatTokensCompact(user.credits_balance)}
          </button>
          <button
            onClick={() => router.push('/conta')}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            ⚙ Conta
          </button>
        </div>
      </header>

      {/* Studio Content */}
      <div className="flex-1">
        {activeTab === 'image'   && <ImageStudio   apiKey={placeholderKey} onGenerationComplete={refreshUser} />}
        {activeTab === 'video'   && <VideoStudio   apiKey={placeholderKey} />}
        {activeTab === 'lipsync' && <LipSyncStudio apiKey={placeholderKey} />}
        {activeTab === 'cinema'  && <CinemaStudio  apiKey={placeholderKey} />}
      </div>

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </div>
  );
}