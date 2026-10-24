'use client';

import { useState, useEffect, useRef } from 'react';

// Vídeos suaves passando ao fundo do site, bem fracos, atrás das letras.
//
// Os arquivos ficam em public/bg/ como bg-1.mp4, bg-2.mp4, bg-3.mp4 (e um
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
const CLIPS = [1, 2, 3].map((n) => ({
  src: `/bg/bg-${n}.mp4`,
  poster: `/bg/bg-${n}.jpg`,
}));

// variant="hero": vitrine (página inicial) — vídeo nítido em tela cheia, com
//   só um degradê suave para as letras continuarem legíveis.
// variant="app": telas de uso (estúdios logados) — o mesmo vídeo, bem mais
//   escuro, para não atrapalhar quem está criando.
export default function VideoBackdrop({ variant = 'app', intensity, intervalMs = 9000, contained = false }) {
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

  // Troca de vídeo a cada intervalMs (cross-fade feito pelo CSS).
  useEffect(() => {
    if (still) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % CLIPS.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [still, intervalMs]);

  // Só o vídeo ativo toca.
  useEffect(() => {
    if (still) return;
    videoRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === active) {
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [active, still]);

  return (
    <div className={`${contained ? 'absolute' : 'fixed'} inset-0 z-0 overflow-hidden pointer-events-none`} aria-hidden="true">
      {CLIPS.map((clip, i) => {
        if (failed[i]) return null;
        const visible = i === active;
        const style = { opacity: visible ? level : 0 };
        const common = 'absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out';
        return still ? (
          <div
            key={clip.src}
            className={`${common} bg-cover bg-center`}
            style={{ ...style, backgroundImage: `url(${clip.poster})` }}
          />
        ) : (
          <video
            key={clip.src}
            ref={(el) => { videoRefs.current[i] = el; }}
            className={common}
            style={style}
            src={clip.src}
            poster={clip.poster}
            muted
            loop
            playsInline
            preload={i === 0 ? 'auto' : 'metadata'}
            autoPlay={i === 0}
            onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
          />
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
