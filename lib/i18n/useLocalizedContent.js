'use client';

import { FEATURES, MODEL_HIGHLIGHTS, STEPS } from '../landing-data.js';
import { FEATURES_EN, MODEL_HIGHLIGHTS_EN, STEPS_EN } from './landing-data-en.js';
import { useTranslation } from './useTranslation.js';

// FEATURES/MODEL_HIGHLIGHTS/STEPS keep their ids, slugs and icons fixed
// (routing and structure never change by language) — only the English
// text gets swapped in when the visitor's locale is English.
export function useLocalizedFeatures() {
  const { locale } = useTranslation();
  if (locale !== 'en') return FEATURES;
  return FEATURES.map((f) => ({ ...f, ...FEATURES_EN[f.id] }));
}

export function useLocalizedModelHighlights() {
  const { locale } = useTranslation();
  if (locale !== 'en') return MODEL_HIGHLIGHTS;
  return MODEL_HIGHLIGHTS_EN;
}

export function useLocalizedSteps() {
  const { locale } = useTranslation();
  if (locale !== 'en') return STEPS;
  return STEPS.map((s) => ({ ...s, ...STEPS_EN[s.n] }));
}

export function useLocalizedFeature(slug) {
  const features = useLocalizedFeatures();
  return features.find((f) => f.slug === slug);
}
