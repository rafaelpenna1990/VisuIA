'use client';

import { dictionary } from './dictionary.js';

// English translation is turned OFF — always resolves to Portuguese,
// regardless of any locale cookie or browser language. Re-enabling it
// later just means restoring the cookie-reading version of this file
// (the middleware and dictionary are still intact, untouched).
export function useTranslation() {
  function t(key) {
    const parts = key.split('.');
    let node = dictionary.pt;
    for (const p of parts) node = node?.[p];
    return node !== undefined ? node : key;
  }

  return { t, locale: 'pt' };
}
