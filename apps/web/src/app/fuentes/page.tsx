import type { Metadata } from 'next';
import Link from 'next/link';

import { AppHeader } from '@/components/app-header';
import { SourcesList } from '@/components/sources-list';
import { messages } from '@/messages/es';

export const metadata: Metadata = {
  title: `${messages.sources.title} · ${messages.app.name}`,
  description: messages.sources.intro,
};

export default function SourcesPage() {
  return (
    <div className="app-shell">
      <AppHeader current="sources" />
      <main className="app-main app-main--page">
        <div className="page">
          <h1 className="page__title">{messages.sources.title}</h1>
          <p className="page__intro">{messages.sources.intro}</p>
          <SourcesList />
          <p className="page__note">{messages.sources.syntheticNote}</p>
          <Link className="page__back" href="/">
            {messages.sources.backToMap}
          </Link>
        </div>
      </main>
    </div>
  );
}
