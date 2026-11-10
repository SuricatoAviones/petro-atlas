'use client';

import dynamic from 'next/dynamic';

import { messages } from '@/messages/es';

/** The diagnostics charts load with the tab, together with ECharts. */
export const LazyDiagnosticsTab = dynamic(
  () => import('./diagnostics-tab').then((module) => module.DiagnosticsTab),
  {
    ssr: false,
    loading: () => (
      <p className="well-sheet__notice" role="status">
        {messages.wellSheet.charts.loading}
      </p>
    ),
  },
);
