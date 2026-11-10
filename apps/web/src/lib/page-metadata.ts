import type { Metadata } from 'next';

import type { Locale } from '@/messages';

/** Metadata with a canonical URL and the alternate language of the same page. */
export function pageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        es: `/es${path}`,
        en: `/en${path}`,
        'x-default': `/es${path}`,
      },
    },
    openGraph: {
      title,
      description,
      locale: locale === 'es' ? 'es_VE' : 'en_US',
      alternateLocale: locale === 'es' ? 'en_US' : 'es_VE',
    },
  };
}
