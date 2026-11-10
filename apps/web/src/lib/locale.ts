import { cookies } from 'next/headers';

import { LOCALE_COOKIE, parseLocale, type Locale } from '@/messages';

/** Locale chosen by the visitor and stored in the functional language cookie. */
export async function getRequestLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}
