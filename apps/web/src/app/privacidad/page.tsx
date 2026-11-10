import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { getRequestLocale } from '@/lib/locale';
import { getMessages } from '@/messages';

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await getRequestLocale());
  return {
    title: `${messages.legal.privacy.title} — ${messages.app.name}`,
    description: messages.legal.privacy.intro,
  };
}

export default async function PrivacyPage() {
  const messages = getMessages(await getRequestLocale());
  return (
    <LegalPage
      title={messages.legal.privacy.title}
      intro={messages.legal.privacy.intro}
      sections={messages.legal.privacy.sections}
    />
  );
}
