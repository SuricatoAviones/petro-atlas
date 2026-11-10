'use client';

import dynamic from 'next/dynamic';

import { ChartLoading } from './lazy-loading';

/** The engineering calculators load with the tab, together with ECharts. */
export const LazyEngineeringTab = dynamic(
  () => import('./engineering-tab').then((module) => module.EngineeringTab),
  {
    ssr: false,
    loading: ChartLoading,
  },
);
