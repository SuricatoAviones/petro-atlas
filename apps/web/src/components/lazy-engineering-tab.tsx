'use client';

import dynamic from 'next/dynamic';

import { messages } from '@/messages/es';

/** The engineering calculators load with the tab, together with ECharts. */
export const LazyEngineeringTab = dynamic(
  () => import('./engineering-tab').then((module) => module.EngineeringTab),
  {
    ssr: false,
    loading: () => (
      <p className="well-sheet__notice" role="status">
        {messages.wellSheet.charts.loading}
      </p>
    ),
  },
);
