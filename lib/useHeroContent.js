'use client';

import { useState, useEffect } from 'react';

const DEFAULT_TITLE = 'Sua ideia vira imagem, vídeo ou cena de cinema **em segundos.**';
const DEFAULT_SUBTITLE = 'Escolha abaixo o que você quer criar e já comece a mexer nas opções — sem precisar de software caro.';

export function useHeroContent() {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  useEffect(() => {
    fetch('/api/hero')
      .then((res) => res.json())
      .then((data) => {
        if (data.title) setTitle(data.title);
        if (data.subtitle) setSubtitle(data.subtitle);
      })
      .catch(() => {});
  }, []);
  return { title, subtitle };
}

// Splits a string on **wrapped** segments and renders those parts with
// the brand accent color. "Sua ideia **em segundos.**" → normal text
// followed by an orange <span>.
export function HighlightedText({ text, highlightClassName = 'text-primary' }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\*\*([^*]+)\*\*$/);
        if (match) {
          return <span key={i} className={highlightClassName}>{match[1]}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
