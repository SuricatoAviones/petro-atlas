import { NextResponse, type NextRequest } from 'next/server';

const LOCALIZED = /^\/(?:es|en)(?:\/|$)/;
const LEGACY_PAGES = new Set(['aviso-legal', 'privacidad', 'datos', 'cookies', 'fuentes']);

/** Sends old unprefixed URLs to the Spanish locale; localized URLs pass through. */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (LOCALIZED.test(pathname)) return NextResponse.next();

  const firstSegment = pathname.split('/')[1] ?? '';
  const needsLocale = pathname === '/' || pathname === '' || LEGACY_PAGES.has(firstSegment);
  if (!needsLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' || pathname === '' ? '/es' : `/es${pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
