import '../globals.css';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { LocaleProvider } from '@/components/locale-provider';
import { LOCALES, getMessages, type Locale } from '@/messages';

const SITE_URL = 'https://petroatlas-web.onrender.com';

export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  const messages = getMessages(locale as Locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: messages.app.name,
      template: `%s — ${messages.app.name}`,
    },
    description: messages.app.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { es: '/es', en: '/en', 'x-default': '/es' },
    },
    openGraph: {
      siteName: messages.app.name,
      locale: locale === 'es' ? 'es_VE' : 'en_US',
      alternateLocale: locale === 'es' ? 'en_US' : 'es_VE',
      type: 'website',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();

  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale as Locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
