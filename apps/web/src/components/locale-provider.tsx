'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, type ReactNode } from 'react';

import { getMessages, type Locale, type Messages } from '@/messages';

interface LocaleContextValue {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Changes the locale segment of the current URL, keeping the query string and hash. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const pathname = usePathname();

  const setLocale = (nextLocale: Locale): void => {
    if (nextLocale === locale) return;
    const withoutLocale = pathname.replace(/^\/(?:es|en)(?=\/|$)/, '');
    // A full reload guarantees that the map's URL writer cannot restore the old locale segment.
    window.location.replace(
      new URL(
        `/${nextLocale}${withoutLocale}${window.location.search}${window.location.hash}`,
        window.location.origin,
      ).href,
    );
  };

  return (
    <LocaleContext.Provider value={{ locale, messages: getMessages(locale), setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value === null) throw new Error('LocaleProvider is missing');
  return value;
}

export function useMessages(): Messages {
  return useLocale().messages;
}
