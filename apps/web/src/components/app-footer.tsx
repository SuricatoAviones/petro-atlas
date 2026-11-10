import Link from 'next/link';

import { messages } from '@/messages/es';

const LEGAL_LINKS = [
  { href: '/aviso-legal', label: messages.legal.notice.title },
  { href: '/privacidad', label: messages.legal.privacy.title },
  { href: '/datos', label: messages.legal.data.title },
  { href: '/cookies', label: messages.legal.cookies.title },
] as const;

/** Footer with the legal pages and the data attribution of the whole site. */
export function AppFooter() {
  return (
    <footer className="app-footer">
      <p>
        {messages.legal.footer.copyright} {messages.legal.footer.data}
      </p>
      <nav aria-label={messages.legal.navigation}>
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
