'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Public, no-auth share page — Fase 1 of "Compartilhar/exportar direto".
// Deliberately has NO backend route and NO database table: the media URL
// already lives on Muapi's public CDN (same URL the studios already use
// directly in <img>/<video> tags, with no auth token), so the share link
// just carries that URL (+ type + an optional prompt snippet) as query
// params. Nothing here touches generation, billing, or any existing page.
function ShareContent() {
  const params = useSearchParams();
  const url = params.get('u');
  const type = params.get('t') === 'video' ? 'video' : 'image';
  const prompt = params.get('p') || '';

  const handleDownload = async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `visuia-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (!url) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-app-bg text-white gap-4 p-6">
        <p className="text-secondary text-sm">Esse link de compartilhamento não é válido.</p>
        <Link
          href="/"
          className="bg-primary text-black px-6 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-glow"
        >
          Ir para a VisuIA →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app-bg text-white p-6 gap-6">
      <Link href="/" className="text-lg font-black tracking-tight text-white hover:text-primary transition-colors">
        VisuIA
      </Link>

      {type === 'video' ? (
        <video
          src={url}
          controls
          autoPlay
          loop
          muted
          playsInline
          className="max-h-[65vh] max-w-[90vw] rounded-3xl shadow-3xl border border-white/10 object-contain bg-black"
        />
      ) : (
        <img
          src={url}
          alt={prompt || 'Criado com VisuIA'}
          className="max-h-[65vh] max-w-[90vw] rounded-3xl shadow-3xl border border-white/10 object-contain"
        />
      )}

      {prompt && (
        <p className="text-secondary text-sm text-center max-w-xl opacity-70">
          &ldquo;{prompt}&rdquo;
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="bg-primary text-black px-6 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-glow active:scale-95"
        >
          ↓ Baixar
        </button>
        <Link
          href="/"
          className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border border-white/5 backdrop-blur-lg text-white"
        >
          Criar o meu com IA →
        </Link>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app-bg" />}>
      <ShareContent />
    </Suspense>
  );
}
