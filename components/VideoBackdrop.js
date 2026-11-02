'use client';

import { useState, useEffect, useRef } from 'react';
import { useAssetsVersion } from '../lib/useAssetsVersion.js';

// Vídeos suaves passando ao fundo do site, bem fracos, atrás das letras.
//
// Os arquivos ficam em public/bg/ como bg-1.mp4 até bg-5.mp4 (e um
// bg-1.jpg, bg-2.jpg, bg-3.jpg de capa). Para usar seus próprios vídeos,
// é só trocar esses arquivos mantendo os nomes e fazer o deploy — não
// precisa mexer em código. Dica: vídeos curtos (5 a 10 s), 960x540 ou
// 1280x720, sem áudio e com menos de 2 MB cada, para não pesar no celular.
//
// Cuidados que o componente já toma:
//  - Só o vídeo da vez toca; os outros ficam pausados (economiza bateria).
//  - Quem pediu "reduzir movimento" no aparelho, ou está com economia de
//    dados, vê só a imagem de capa parada.
//  - Se um arquivo de vídeo não existir ou falhar, ele é ignorado sem erro.
//  - Um véu escuro por cima garante que o texto continua legível.
// Os vídeos são servidos por /api/assets/bg/: o que foi enviado pelo painel
// Admin (aba Aparência) tem prioridade; enquanto nada for enviado, vale o
// arquivo que já vem em public/bg/.
const CLIPS = [1, 2, 3, 4, 5].map((n) => ({
  mp4: `/api/assets/bg/bg-${n}.mp4`,
  poster: `/bg/bg-${n}.jpg`,
}));

// variant="hero": vitrine (página inicial) — vídeo nítido em tela cheia, com
//   só um degradê suave para as letras continuarem legíveis.
// variant="app": telas de uso (estúdios logados) — o mesmo vídeo, bem mais
//   escuro, para não atrapalhar quem está criando.
export default function VideoBackdrop({ variant = 'app', intensity, intervalMs = 9000, contained = false }) {
  const version = useAssetsVersion();
  const hero = variant === 'hero';
  const level = intensity ?? (hero ? 0.95 : 0.22);
  const [active, setActive] = useState(0);
  const [still, setStill] = useState(false); // true = só imagem parada
  const [failed, setFailed] = useState({});
  const videoRefs = useRef([]);

  // Decide uma vez, no navegador, se vale tocar vídeo.
  useEffect(() => {
    try {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const saveData = navigator.connection && navigator.connection.saveData;
      if (reduce || saveData) setStill(true);
    } catch {
      /* sem suporte: segue com vídeo */
    }
  }, []);

  // Vídeos que estão funcionando, na ordem.
  const available = CLIPS.map((_, i) => i).filter((i) => !failed[i]);
  const single = available.length <= 1;

  // Se o vídeo da vez não existe (ou falhou), pula para o primeiro que existe.
  useEffect(() => {
    if (available.length > 0 && !available.includes(active)) setActive(available[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  // O próximo vídeo da fila: já começa a baixar enquanto o atual toca, para
  // a troca não travar esperando carregar.
  const nextIndex = single ? -1 : available[(available.indexOf(active) + 1) % available.length];

  const goNext = () => {
    if (single || nextIndex < 0) return;
    setActive(nextIndex);
  };

  // Quando um vídeo termina, passa para o próximo (cada um toca uma vez só,
  // do começo ao fim). Com um único vídeo, ele fica em loop.
  const handleEnded = (i) => {
    if (i !== active) return;
    goNext();
  };

  // Perto do fim do vídeo atual, se o próximo já está carregado, começa a
  // troca (fade cruzado) sem esperar o final: não fica tela parada.
  const handleTimeUpdate = (i) => {
    if (single || i !== active) return;
    const cur = videoRefs.current[i];
    const nxt = videoRefs.current[nextIndex];
    if (!cur || !nxt || !Number.isFinite(cur.duration)) return;
    if (cur.duration - cur.currentTime <= 1.6 && nxt.readyState >= 3) goNext();
  };

  // Só o vídeo ativo começa do zero; o anterior continua mais 2 segundos
  // (enquanto some devagar) e só depois é pausado.
  useEffect(() => {
    if (still) return undefined;
    videoRefs.current.forEach((el, i) => {
      if (!el || i !== active) return;
      try { el.currentTime = 0; } catch { /* ainda sem metadados */ }
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    });
    const timer = setTimeout(() => {
      videoRefs.current.forEach((el, i) => {
        if (el && i !== active) el.pause();
      });
    }, 2300);
    return () => clearTimeout(timer);
  }, [active, still, version]);

  return (
    <div className={`${contained ? 'absolute' : 'fixed'} inset-0 z-0 overflow-hidden pointer-events-none`} aria-hidden="true">
      {CLIPS.map((clip, i) => {
        if (failed[i]) return null;
        const visible = i === active;
        const style = { opacity: visible ? level : 0 };
        const common = 'absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out';
        return still ? (
          <div
            key={clip.mp4}
            className={`${common} bg-cover bg-center`}
            style={{ ...style, backgroundImage: `url(${clip.poster})` }}
          />
        ) : (
          <video
            key={`${clip.mp4}-${version}`}
            ref={(el) => { videoRefs.current[i] = el; }}
            className={common}
            style={style}
            muted
            loop={single}
            onEnded={() => handleEnded(i)}
            onTimeUpdate={() => handleTimeUpdate(i)}
            playsInline
            poster={clip.poster}
            preload={i === active || i === nextIndex ? 'auto' : 'metadata'}
            autoPlay={i === 0}
          >
            <source
              src={`${clip.mp4}?v=${version}`}
              type="video/mp4"
              onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
            />
          </video>
        );
      })}
      {/* Degradê para o texto ficar legível */}
      <div
        className="absolute inset-0"
        style={{
          background: hero
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.85) 100%), radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 65%)'
            : 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.85))',
        }}
      />
    </div>
  );
}
