'use client';

import Link from 'next/link';

import { useLocale, useMessages } from './locale-provider';

interface AppHeaderProps {
  /** Page highlighted in the header; legal pages do not highlight any. */
  current?: 'map' | 'sources';
}

/** Application header with the main pages and the language switch. */
export function AppHeader({ current }: AppHeaderProps) {
  const messages = useMessages();
  const { locale, setLocale } = useLocale();

  return (
    <header className="app-header">
      <h1 className="app-header__title">{messages.app.name}</h1>
      <p className="app-header__tagline">{messages.app.tagline}</p>
      <nav className="app-header__nav" aria-label={messages.app.navigation}>
        <Link href="/" aria-current={current === 'map' ? 'page' : undefined}>
          {messages.app.map}
        </Link>
        <Link href="/fuentes" aria-current={current === 'sources' ? 'page' : undefined}>
          {messages.app.sources}
        </Link>
      </nav>
      <div className="app-header__language" role="group" aria-label={messages.app.language}>
        {(['es', 'en'] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={locale === candidate}
            lang={candidate}
            onClick={() => {
              setLocale(candidate);
            }}
          >
            {candidate === 'es' ? messages.app.spanish : messages.app.english}
          </button>
        ))}
      </div>
    </header>
  );
}
