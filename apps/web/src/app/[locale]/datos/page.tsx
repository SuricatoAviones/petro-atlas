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
  return pageMetadata(locale, '/datos', messages.legal.data.title, messages.legal.data.intro);
}

export default async function DataPage({ params }: { params: Promise<{ locale: string }> }) {
  const messages = getMessages(parseLocale((await params).locale));
  return (
    <LegalPage
      title={messages.legal.data.title}
      intro={messages.legal.data.intro}
      sections={messages.legal.data.sections}
    />
  );
}
