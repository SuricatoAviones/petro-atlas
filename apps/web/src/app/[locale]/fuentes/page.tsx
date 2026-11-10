import type { Metadata } from 'next';
import Link from 'next/link';

import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { SourcesList } from '@/components/sources-list';
import { pageMetadata } from '@/lib/page-metadata';
import { getMessages, parseLocale } from '@/messages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  const messages = getMessages(locale);
  return pageMetadata(locale, '/fuentes', messages.sources.title, messages.sources.intro);
}

export default async function SourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocale((await params).locale);
  const messages = getMessages(locale);

  return (
    <div className="app-shell">
      <AppHeader current="sources" />
      <main className="app-main app-main--page">
        <div className="page">
          <h1 className="page__title">{messages.sources.title}</h1>
          <p className="page__intro">{messages.sources.intro}</p>
          <SourcesList />
          <p className="page__note">{messages.sources.syntheticNote}</p>
          <Link className="page__back" href={`/${locale}`}>
            {messages.sources.backToMap}
          </Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
