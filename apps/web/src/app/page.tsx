import { Suspense } from 'react';

import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { MapExplorer } from '@/components/map-explorer';
import { getRequestLocale } from '@/lib/locale';
import { getMessages } from '@/messages';

export default async function HomePage() {
  const messages = getMessages(await getRequestLocale());

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
