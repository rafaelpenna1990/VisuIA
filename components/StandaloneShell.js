'use client';

import { useState, useEffect, useCallback } from 'react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';
import AuthGate from './AuthGate';
import TopUpModal from './TopUpModal';

const TABS = [
  { id: 'image',   label: 'Image Studio' },
  { id: 'video',   label: 'Video Studio' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'cinema',  label: 'Cinema Studio' },
];

function formatBRL(n) {
  return (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function StandaloneShell() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('image');
  const [showSettings, setShowSettings] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const refreshUser = useCallback(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    setUser(data.user);
  }, []);

  useEffect(() => {
    setHasMounted(true);
    refreshUser();
  }, [refreshUser]);

  // Refresh balance whenever the tab regains focus (e.g. after a generation
  // or after coming back from the Stripe checkout tab).
  useEffect(() => {
    const onFocus = () => refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshUser]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    setShowSettings(false);
  }, []);

  if (!hasMounted) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin text-[#d9ff00] text-3xl">◌</div>
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
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-lg tracking-wider uppercase">
            Open Higgsfield AI
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#d9ff00] text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTopUp(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#d9ff00]/10 text-[#d9ff00] hover:bg-[#d9ff00]/20 transition-colors"
          >
            {formatBRL(user.credits_balance)}
          </button>
          <button
            onClick={() => setShowSettings(true)}
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

      {/* Account Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-white font-bold text-xl mb-6">Conta</h2>
            <p className="text-white/50 text-sm mb-2">
              Logado como <span className="text-white/80">{user.email}</span>
            </p>
            <p className="text-white/50 text-sm mb-6">
              Saldo: <span className="text-[#d9ff00] font-semibold">{formatBRL(user.credits_balance)}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors"
              >
                Sair
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </div>
  );
}
