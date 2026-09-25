'use client';

import { useState, useEffect } from 'react';
import { dictionary } from './dictionary.js';

function readLocaleCookie() {
  if (typeof document === 'undefined') return 'pt';
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  return match && (match[1] === 'en' || match[1] === 'pt') ? match[1] : 'pt';
}

// Reads the locale the middleware already detected (from a cookie) and
// returns a t(key) function that looks up "section.key" in the shared
// dictionary — falling back to Portuguese, then to the key itself, so a
// missing translation never breaks the page, it just shows in Portuguese.
export function useTranslation() {
  const [locale, setLocale] = useState('pt');

  useEffect(() => {
    setLocale(readLocaleCookie());
  }, []);

  function t(key) {
    const parts = key.split('.');
    let node = dictionary[locale];
    for (const p of parts) node = node?.[p];
    if (node !== undefined) return node;

    let fallback = dictionary.pt;
    for (const p of parts) fallback = fallback?.[p];
    return fallback !== undefined ? fallback : key;
  }

  return { t, locale };
}
