'use client';

import { dictionary } from './dictionary.js';

// English translation is turned OFF — always resolves to Portuguese,
// regardless of any locale cookie or browser language. Re-enabling it
// later just means restoring the cookie-reading version of this file
// (the middleware and dictionary are still intact, untouched).
export function useTranslation() {
  function t(key, vars) {
    const parts = key.split('.');
    let node = dictionary.pt;
    for (const p of parts) node = node?.[p];
    if (node === undefined) return key;
    // Optional {varName} substitution, e.g. t('x.y', { days: trialDays })
    // for strings whose wording depends on the admin-configurable trial
    // length instead of a fixed number baked into the dictionary.
    if (typeof node === 'string' && vars) {
      return node.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? vars[name] : match));
    }
    return node;
  }

  return { t, locale: 'pt' };
}
