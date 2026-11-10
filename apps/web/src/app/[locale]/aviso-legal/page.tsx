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
    '/aviso-legal',
    messages.legal.notice.title,
    messages.legal.notice.intro,
  );
}

export default async function LegalNoticePage({ params }: { params: Promise<{ locale: string }> }) {
  const messages = getMessages(parseLocale((await params).locale));
  return (
    <LegalPage
      title={messages.legal.notice.title}
      intro={messages.legal.notice.intro}
      sections={messages.legal.notice.sections}
    />
  );
}
