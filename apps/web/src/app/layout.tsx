import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { LocaleProvider } from '@/components/locale-provider';
import { getRequestLocale } from '@/lib/locale';
import { getMessages } from '@/messages';

export async function generateMetadata(): Promise<Metadata> {
  const messages = getMessages(await getRequestLocale());
  return {
    title: messages.app.name,
    description: messages.app.description,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
