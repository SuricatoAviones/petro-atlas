import type { MetadataRoute } from 'next';

import { LOCALES } from '@/messages';

const SITE_URL = 'https://petroatlas-web.onrender.com';
const PATHS = ['', '/fuentes', '/aviso-legal', '/privacidad', '/datos', '/cookies'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: path === '' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '' ? 1 : 0.5,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((alternate) => [alternate, `${SITE_URL}/${alternate}${path}`]),
        ),
      },
    })),
  );
}
