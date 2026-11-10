import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { messages } from '@/messages/es';

export const metadata: Metadata = {
  title: `${messages.legal.privacy.title} · ${messages.app.name}`,
  description: messages.legal.privacy.intro,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title={messages.legal.privacy.title}
      intro={messages.legal.privacy.intro}
      sections={messages.legal.privacy.sections}
    />
  );
}
