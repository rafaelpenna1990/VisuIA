'use client';

import { useState, useEffect } from 'react';

// Fetches the admin-editable promo banner text once. Falls back to a
// sensible default while loading (or if the request fails) so the page
// never shows an empty gap.
const DEFAULT_PROMO = '🎁 7 dias grátis + 500 VisuTokens de bônus só por assinar';

export function usePromoText() {
  const [text, setText] = useState(DEFAULT_PROMO);
  useEffect(() => {
    fetch('/api/promo')
      .then((res) => res.json())
      .then((data) => { if (data.text) setText(data.text); })
      .catch(() => {});
  }, []);
  return text;
}
