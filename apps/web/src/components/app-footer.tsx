'use client';

import Link from 'next/link';

import { useLocale, useMessages } from './locale-provider';

/** Footer with the legal pages, the demo data notice and project links. */
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
      <p className="app-footer__demo">
        <Link href={`/${locale}/datos`}>{messages.legal.footer.demoData}</Link>
      </p>
      <nav aria-label={messages.legal.navigation}>
        {legalLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <nav aria-label={messages.app.projectLinks} className="app-footer__project">
        <a href="https://github.com/SuricatoAviones/petro-atlas" target="_blank" rel="noreferrer">
          {messages.legal.footer.github}
        </a>
        <a
          href="https://www.npmjs.com/package/@suricatoaviones/petro-calc"
          target="_blank"
          rel="noreferrer"
        >
          {messages.legal.footer.npm}
        </a>
        <Link href={`/${locale}/acerca`}>{messages.legal.footer.about}</Link>
      </nav>
    </footer>
  );
}
