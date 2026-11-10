import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { getRequestLocale } from '@/lib/locale';
import { getMessages } from '@/messages';

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await getRequestLocale());
  return {
    title: `${messages.legal.notice.title} — ${messages.app.name}`,
    description: messages.legal.notice.intro,
  };
}

export default async function LegalNoticePage() {
  const messages = getMessages(await getRequestLocale());
  return (
    <LegalPage
      title={messages.legal.notice.title}
      intro={messages.legal.notice.intro}
      sections={messages.legal.notice.sections}
    />
  );
}
