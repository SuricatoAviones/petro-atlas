import { messages as messagesEs, type Messages } from './es';
import { messagesEn } from './en';

export type { Messages };

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

export function parseLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale): Messages {
  return locale === 'en' ? messagesEn : messagesEs;
}
