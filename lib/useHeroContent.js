'use client';

import { useState, useEffect } from 'react';
import { dictionary } from './i18n/dictionary.js';
import { useTranslation } from './i18n/useTranslation.js';

export function useHeroContent() {
  const { locale } = useTranslation();
  const [title, setTitle] = useState(dictionary.pt.hero.defaultTitle);
  const [subtitle, setSubtitle] = useState(dictionary.pt.hero.defaultSubtitle);

  useEffect(() => {
    let ignore = false;
    // English visitors get the fixed English default — the admin panel's
    // editable hero text is Portuguese-only for now, so we don't want a
    // half-English/half-Portuguese sentence for them.
    if (locale === 'en') {
      setTitle(dictionary.en.hero.defaultTitle);
      setSubtitle(dictionary.en.hero.defaultSubtitle);
      return;
    }
    fetch('/api/hero')
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return; // locale changed away from 'pt' before this landed
        if (data.title) setTitle(data.title);
        if (data.subtitle) setSubtitle(data.subtitle);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [locale]);

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
