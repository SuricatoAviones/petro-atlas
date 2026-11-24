import type { Metadata } from 'next';
import Link from 'next/link';

import { AppFooter } from '@/components/app-footer';
import { AppHeader } from '@/components/app-header';
import { pageMetadata } from '@/lib/page-metadata';
import { getMessages, parseLocale } from '@/messages';

const REPOSITORY = 'https://github.com/SuricatoAviones/petro-atlas';
const PACKAGE = 'https://www.npmjs.com/package/@suricatoaviones/petro-calc';
const DOCS = `${REPOSITORY}/tree/main/docs`;
const CONTRIBUTING = `${REPOSITORY}/blob/main/CONTRIBUTING.md`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  const messages = getMessages(locale);
  return pageMetadata(locale, '/acerca', messages.about.title, messages.about.intro);
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocale((await params).locale);
  const messages = getMessages(locale);

  return (
    <div className="app-shell">
      <AppHeader current="about" />
      <main className="app-main app-main--page">
        <article className="page">
          <h1 className="page__title">{messages.about.title}</h1>
          <p className="page__intro">{messages.about.intro}</p>

          {messages.about.sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <div className="about-links">
            <a href={REPOSITORY} target="_blank" rel="noreferrer">
              {messages.about.links.github}
            </a>
            <a href={PACKAGE} target="_blank" rel="noreferrer">
              {messages.about.links.npm}
            </a>
            <a href={DOCS} target="_blank" rel="noreferrer">
              {messages.about.links.docs}
            </a>
            <Link href={`/${locale}/datos`}>{messages.about.links.data}</Link>
            <a href={CONTRIBUTING} target="_blank" rel="noreferrer">
              {messages.about.links.collaborate}
            </a>
          </div>

          <Link className="page__back" href={`/${locale}`}>
            {messages.legal.backToMap}
          </Link>
        </article>
      </main>
      <AppFooter />
    </div>
  );
}
