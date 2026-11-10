import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { getRequestLocale } from '@/lib/locale';
import { getMessages } from '@/messages';

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await getRequestLocale());
  return {
    title: `${messages.legal.cookies.title} — ${messages.app.name}`,
    description: messages.legal.cookies.intro,
  };
}

export default async function CookiesPage() {
  const messages = getMessages(await getRequestLocale());
  return (
    <LegalPage
      title={messages.legal.cookies.title}
      intro={messages.legal.cookies.intro}
      sections={messages.legal.cookies.sections}
    />
  );
}
