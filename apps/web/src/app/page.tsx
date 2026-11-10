import { Suspense } from 'react';

import { MapExplorer } from '@/components/map-explorer';
import { messages } from '@/messages/es';

export default function HomePage() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-header__title">{messages.app.name}</h1>
        <p className="app-header__tagline">{messages.app.tagline}</p>
      </header>
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
    </div>
  );
}
