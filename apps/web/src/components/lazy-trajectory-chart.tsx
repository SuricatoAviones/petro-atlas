'use client';

import dynamic from 'next/dynamic';

import { ChartLoading } from './lazy-loading';

export const LazyTrajectoryChart = dynamic(
  () => import('./trajectory-chart').then((module) => module.TrajectoryChart),
  {
    ssr: false,
    loading: ChartLoading,
  },
);
