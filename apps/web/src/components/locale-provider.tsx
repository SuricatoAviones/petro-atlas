'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { getMessages, LOCALE_COOKIE, type Locale, type Messages } from '@/messages';

interface LocaleContextValue {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Stores the language and reloads so server-rendered pages and charts use it too. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const setLocale = (nextLocale: Locale): void => {
    // A functional cookie: it only remembers the language chosen by the visitor.
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
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
