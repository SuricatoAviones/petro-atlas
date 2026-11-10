'use client';

import { useMessages } from './locale-provider';

export function ChartLoading() {
  const messages = useMessages();
  return (
    <p className="well-sheet__notice" role="status">
      {messages.wellSheet.charts.loading}
    </p>
  );
}

export function MapLoading() {
  const messages = useMessages();
  return (
    <div className="well-map">
      <p className="well-map__notice" role="status">
        {messages.map.loading}
      </p>
    </div>
  );
}
