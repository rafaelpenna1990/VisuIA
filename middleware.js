import { NextResponse } from 'next/server';

// Detects the visitor's language once (from the browser's Accept-Language
// header — no external geo lookup needed) and remembers it in a cookie,
// so every page can read it without re-detecting on every request. A
// manual ?lang=en or ?lang=pt in the URL always wins and updates the
// cookie, so people (and ad landing pages) can force a language.
export function middleware(request) {
  const response = NextResponse.next();

  const forcedLang = request.nextUrl.searchParams.get('lang');
  if (forcedLang === 'en' || forcedLang === 'pt') {
    response.cookies.set('locale', forcedLang, { maxAge: 60 * 60 * 24 * 365, path: '/' });
    return response;
  }

  const existing = request.cookies.get('locale');
  if (existing) return response;

  const acceptLanguage = request.headers.get('accept-language') || '';
  const prefersPortuguese = /^\s*pt/i.test(acceptLanguage) || acceptLanguage.toLowerCase().includes('pt-br');
  const locale = prefersPortuguese ? 'pt' : 'en';

  response.cookies.set('locale', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' });
  return response;
}

export const config = {
  // Skip API routes, static files, and internal Next.js assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|carousel).*)'],
};
