'use client';

import Link from 'next/link';

import { useLocale, useMessages } from './locale-provider';

/** Footer with the legal pages and the data attribution of the whole site. */
export function AppFooter() {
  const messages = useMessages();
  const { locale } = useLocale();
  const legalLinks = [
    { href: `/${locale}/aviso-legal`, label: messages.legal.notice.title },
    { href: `/${locale}/privacidad`, label: messages.legal.privacy.title },
    { href: `/${locale}/datos`, label: messages.legal.data.title },
    { href: `/${locale}/cookies`, label: messages.legal.cookies.title },
  ] as const;

  return (
    <footer className="app-footer">
      <p>
        {messages.legal.footer.copyright} {messages.legal.footer.data}
      </p>
      <nav aria-label={messages.legal.navigation}>
        {legalLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
