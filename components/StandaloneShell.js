'use client';

import { useState, useEffect, useCallback } from 'react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio } from 'studio';
import AuthGate from './AuthGate';
import TopUpModal from './TopUpModal';

const TABS = [
  { id: 'image',   label: 'Imagem' },
  { id: 'video',   label: 'Vídeo' },
  { id: 'lipsync', label: 'Sincronia Labial' },
  { id: 'cinema',  label: 'Cinema' },
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
    <div className="min-h-screen bg-[#0D0810] flex items-center justify-center">
      <div className="animate-spin text-[#FF5A36] text-3xl">◌</div>
    </div>
  );

  if (!user) {
    return <AuthGate onAuthenticated={setUser} />;
  }

  const placeholderKey = 'server-managed';

  return (
    <div className="h-screen bg-[#0D0810] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-lg tracking-wider uppercase">
            VisuIA
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
            onClick={() => setShowTopUp(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#FF5A36]/10 text-[#FF5A36] hover:bg-[#FF5A36]/20 transition-colors"
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
          <div className="bg-[#150E1C] border border-white/10 rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-white font-bold text-xl mb-6">Conta</h2>
            <p className="text-white/50 text-sm mb-2">
              Logado como <span className="text-white/80">{user.email}</span>
            </p>
            <p className="text-white/50 text-sm mb-6">
              Saldo: <span className="text-[#FF5A36] font-semibold">{formatBRL(user.credits_balance)}</span>
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