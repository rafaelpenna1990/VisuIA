'use client';

import { useState, useEffect } from 'react';
import { dictionary } from './i18n/dictionary.js';
import { useTranslation } from './i18n/useTranslation.js';

// Fetches the admin-editable promo banner text once. Falls back to a
// sensible default while loading (or if the request fails) so the page
// never shows an empty gap.
export function usePromoText() {
  const { locale } = useTranslation();
  const [text, setText] = useState(dictionary.pt.promo.default);

  useEffect(() => {
    let ignore = false;
    // English visitors get the fixed English default — same reasoning as
    // the hero text: the admin's promo text is Portuguese-only for now.
    if (locale === 'en') {
      setText(dictionary.en.promo.default);
      return;
    }
    fetch('/api/promo')
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.text) setText(data.text);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [locale]);

  return text;
}
