import Link from 'next/link';

import { messages } from '@/messages/es';

interface AppHeaderProps {
  current: 'map' | 'sources';
}

/** Application header with the two pages of phase 1. */
export function AppHeader({ current }: AppHeaderProps) {
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
    </header>
  );
}
