import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { getRequestLocale } from '@/lib/locale';
import { getMessages } from '@/messages';

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await getRequestLocale());
  return {
    title: `${messages.legal.data.title} — ${messages.app.name}`,
    description: messages.legal.data.intro,
  };
}

export default async function DataPage() {
  const messages = getMessages(await getRequestLocale());
  return (
    <LegalPage
      title={messages.legal.data.title}
      intro={messages.legal.data.intro}
      sections={messages.legal.data.sections}
    />
  );
}
