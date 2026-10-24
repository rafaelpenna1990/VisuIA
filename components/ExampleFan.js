'use client';

import { useState, useEffect } from 'react';
import { useAssetsVersion } from '../lib/useAssetsVersion.js';

// Leque de imagens de exemplo, no centro da página, logo acima da caixa de
// prompt: a imagem do meio é a maior e as das pontas ficam menores,
// inclinadas e mais escuras (como no Artlist).
//
// As imagens vêm do mesmo lugar da antiga galeria: arquivos
// {slug}-1, {slug}-2, ... até {slug}-5 (jpg, jpeg, png ou webp), enviados
// pelo painel admin. Quantas existirem, quantas aparecem — com 1 a 5
// imagens o leque se ajusta sozinho. Se não existir nenhuma, nada é
// mostrado (sem buraco na página).
const SLOTS = [1, 2, 3, 4, 5];
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function probe(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function findSlot(slug, n, version) {
  for (const ext of EXTENSIONS) {
    const src = `/api/assets/carousel/${slug}-${n}.${ext}?v=${version}`;
    if (await probe(src)) return src;
  }
  return null;
}

// Quanto cada posição, contada a partir do centro, é menor/inclinada/escura.
const LOOKS = [
  { scale: 1, rotate: 0, opacity: 1, lift: 0 },
  { scale: 0.86, rotate: 7, opacity: 0.75, lift: 14 },
  { scale: 0.74, rotate: 13, opacity: 0.5, lift: 30 },
];

export default function ExampleFan({ slug }) {
  const version = useAssetsVersion();
  const [images, setImages] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setImages([]);
    Promise.all(SLOTS.map((n) => findSlot(slug, n, version))).then((found) => {
      if (!cancelled) setImages(found.filter(Boolean));
    });
    return () => { cancelled = true; };
  }, [slug, version]);

  if (images.length === 0) return null;

  const mid = (images.length - 1) / 2;

  return (
    <div className="flex items-end justify-center mb-8 md:mb-10 h-44 md:h-56 select-none pointer-events-none" aria-hidden="true">
      {images.map((src, i) => {
        const dist = Math.round(Math.abs(i - mid));
        const side = i < mid ? -1 : 1;
        const look = LOOKS[Math.min(dist, LOOKS.length - 1)];
        return (
          <div
            key={src}
            className="shrink-0 w-24 md:w-36 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-3xl bg-black -mx-2 md:-mx-3"
            style={{
              transform: `translateY(${look.lift}px) rotate(${look.rotate * side}deg) scale(${look.scale})`,
              opacity: look.opacity,
              zIndex: 10 - dist,
            }}
          >
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        );
      })}
    </div>
  );
}
