'use client';

import Link from 'next/link';

import { useMessages } from './locale-provider';
import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';

interface LegalLink {
  href: string;
  label: string;
}

export interface LegalSection {
  title: string;
  paragraphs: readonly string[];
  links?: readonly LegalLink[];
}

interface LegalPageProps {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
}

function SectionLink({ link }: { link: LegalLink }) {
  if (link.href.startsWith('http')) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer">
        {link.label}
      </a>
    );
  }
  return <Link href={link.href}>{link.label}</Link>;
}

/** Shared shell and section renderer for the legal pages. */
export function LegalPage({ title, intro, sections }: LegalPageProps) {
  const messages = useMessages();

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main app-main--page">
        <article className="page legal-page">
          <h1 className="page__title">{title}</h1>
          <p className="page__intro">{intro}</p>
          <p className="legal-page__updated">{messages.legal.updated}</p>
          {sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.links !== undefined && section.links.length > 0 && (
                <p className="legal-section__links">
                  {section.links.map((link) => (
                    <SectionLink key={link.href} link={link} />
                  ))}
                </p>
              )}
            </section>
          ))}
          <p className="page__note">{messages.legal.draftNote}</p>
          <Link className="page__back" href="/">
            {messages.legal.backToMap}
          </Link>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
