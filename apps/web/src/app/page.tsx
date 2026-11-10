import { LazyWellMap } from '@/components/lazy-well-map';
import { messages } from '@/messages/es';

export default function HomePage() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-header__title">{messages.app.name}</h1>
        <p className="app-header__tagline">{messages.app.tagline}</p>
      </header>
      <main className="app-main">
        <LazyWellMap />
      </main>
    </div>
  );
}
