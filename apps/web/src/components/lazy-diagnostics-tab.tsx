'use client';

import dynamic from 'next/dynamic';

import { ChartLoading } from './lazy-loading';

/** The diagnostics charts load with the tab, together with ECharts. */
export const LazyDiagnosticsTab = dynamic(
  () => import('./diagnostics-tab').then((module) => module.DiagnosticsTab),
  {
    ssr: false,
    loading: ChartLoading,
  },
);
