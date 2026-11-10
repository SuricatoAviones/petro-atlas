import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { messages } from '@/messages/es';

export const metadata: Metadata = {
  title: `${messages.legal.data.title} · ${messages.app.name}`,
  description: messages.legal.data.intro,
};

export default function DataPage() {
  return (
    <LegalPage
      title={messages.legal.data.title}
      intro={messages.legal.data.intro}
      sections={messages.legal.data.sections}
    />
  );
}
