'use client';

import dynamic from 'next/dynamic';

import { messages } from '@/messages/es';

export const LazyTrajectoryChart = dynamic(
  () => import('./trajectory-chart').then((module) => module.TrajectoryChart),
  {
    ssr: false,
    loading: () => (
      <p className="well-sheet__notice" role="status">
        {messages.wellSheet.charts.loading}
      </p>
    ),
  },
);
