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
    '/privacidad',
    messages.legal.privacy.title,
    messages.legal.privacy.intro,
  );
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const messages = getMessages(parseLocale((await params).locale));
  return (
    <LegalPage
      title={messages.legal.privacy.title}
      intro={messages.legal.privacy.intro}
      sections={messages.legal.privacy.sections}
    />
  );
}
