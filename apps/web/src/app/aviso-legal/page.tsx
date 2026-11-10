import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { messages } from '@/messages/es';

export const metadata: Metadata = {
  title: `${messages.legal.notice.title} · ${messages.app.name}`,
  description: messages.legal.notice.intro,
};

export default function LegalNoticePage() {
  return (
    <LegalPage
      title={messages.legal.notice.title}
      intro={messages.legal.notice.intro}
      sections={messages.legal.notice.sections}
    />
  );
}
