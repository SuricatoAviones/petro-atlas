'use client';

import dynamic from 'next/dynamic';

import { ChartLoading } from './lazy-loading';

/**
 * ECharts and the chart options weigh several hundred kilobytes, so they load only when a well
 * sheet opens a tab with charts.
 */
export const LazyProductionCharts = dynamic(
  () => import('./production-charts').then((module) => module.ProductionCharts),
  {
    ssr: false,
    loading: ChartLoading,
  },
);
