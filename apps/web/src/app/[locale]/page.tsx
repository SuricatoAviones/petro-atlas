import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { MapExplorer } from '@/components/map-explorer';
import { pageMetadata } from '@/lib/page-metadata';
import { getMessages, parseLocale } from '@/messages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  const messages = getMessages(locale);
  return pageMetadata(locale, '', messages.app.tagline, messages.app.description);
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocale((await params).locale);
  const messages = getMessages(locale);

  return (
    <div className="app-shell">
      <AppHeader current="map" />
      <main className="app-main">
        <Suspense
          fallback={
            <div className="well-map">
              <p className="well-map__notice" role="status">
                {messages.map.loading}
              </p>
            </div>
          }
        >
          <MapExplorer />
        </Suspense>
      </main>
      <AppFooter />
    </div>
  );
}
