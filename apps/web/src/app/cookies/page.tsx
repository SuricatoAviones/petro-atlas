import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { messages } from '@/messages/es';

export const metadata: Metadata = {
  title: `${messages.legal.cookies.title} · ${messages.app.name}`,
  description: messages.legal.cookies.intro,
};

export default function CookiesPage() {
  return (
    <LegalPage
      title={messages.legal.cookies.title}
      intro={messages.legal.cookies.intro}
      sections={messages.legal.cookies.sections}
    />
  );
}
