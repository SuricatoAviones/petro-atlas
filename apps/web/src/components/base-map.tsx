'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { Map as MapLibreMap, NavigationControl, ScaleControl } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import { messages } from '@/messages/es';

import { mapConfig } from './map-config';

type MapStatus = 'loading' | 'ready' | 'error';

/** Full-size MapLibre basemap. Wells and fields are added on top in phase 1. */
export function BaseMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>('loading');

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const map = new MapLibreMap({
      container,
      style: mapConfig.styleUrl,
      center: [mapConfig.initialCenter.lon, mapConfig.initialCenter.lat],
      zoom: mapConfig.initialZoom,
      attributionControl: { compact: true },
      locale: messages.map.controls,
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.once('load', () => {
      setStatus('ready');
    });
    // Once the style has loaded, a failed tile is not fatal; before that, the map is unusable.
    map.on('error', () => {
      if (!map.loaded()) setStatus((current) => (current === 'loading' ? 'error' : current));
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="base-map">
      <div
        ref={containerRef}
        className="base-map__canvas"
        role="region"
        aria-label={messages.map.label}
        aria-busy={status === 'loading'}
      />
      {status === 'loading' && (
        <p className="base-map__notice" role="status">
          {messages.map.loading}
        </p>
      )}
      {status === 'error' && (
        <p className="base-map__notice base-map__notice--error" role="alert">
          {messages.map.loadError}
        </p>
      )}
    </div>
  );
}
