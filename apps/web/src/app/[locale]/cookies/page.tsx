import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { pageMetadata } from '@/lib/page-metadata';
import { getMessages, parseLocale } from '@/messages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = parseLocale((await params).locale);
  const messages = getMessages(locale);
  return pageMetadata(
    locale,
    '/cookies',
    messages.legal.cookies.title,
    messages.legal.cookies.intro,
  );
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const messages = getMessages(parseLocale((await params).locale));
  return (
    <LegalPage
      title={messages.legal.cookies.title}
      intro={messages.legal.cookies.intro}
      sections={messages.legal.cookies.sections}
    />
  );
}
