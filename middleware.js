import { NextResponse } from 'next/server';

// English translation is turned off (2026-09-25) — this middleware no
// longer detects a language or sets any cookie, so every visitor always
// gets the Portuguese site. The i18n system underneath (dictionary,
// useTranslation, etc.) is untouched — re-enabling English later is just
// restoring the locale-detection logic here.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
