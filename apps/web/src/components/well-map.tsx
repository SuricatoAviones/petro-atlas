'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import {
  Map as MapLibreMap,
  type MapLayerMouseEvent,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import { messages } from '@/messages/es';

import { mapConfig } from './map-config';
import type { WellColorMode } from './well-colors';
import {
  CLUSTER_LAYER_ID,
  FIELD_SOURCE_ID,
  WELL_SOURCE_ID,
  addWellLayers,
  setWellColorMode,
} from './well-layers';

type MapStatus = 'loading' | 'ready' | 'error';

const COLOR_MODES: readonly WellColorMode[] = ['status', 'type'];
const DEFAULT_COLOR_MODE: WellColorMode = 'status';
/** Zoom levels gained by clicking a cluster. */
const CLUSTER_CLICK_ZOOM_STEP = 2;

const DATA_SOURCE_IDS: readonly string[] = [WELL_SOURCE_ID, FIELD_SOURCE_ID];

function isDataSource(sourceId: unknown): boolean {
  return typeof sourceId === 'string' && DATA_SOURCE_IDS.includes(sourceId);
}

/** Full-size map of wells, grouped at low zoom, with field outlines from a zoom level on. */
export function WellMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap>(null);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [hasDataError, setHasDataError] = useState(false);
  const [colorMode, setColorMode] = useState<WellColorMode>(DEFAULT_COLOR_MODE);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    // MapLibre looks for its worker next to its own module, which no longer holds once the
    // library is bundled. This reference makes the bundler emit the worker as a static asset.
    setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);

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
      addWellLayers(map, DEFAULT_COLOR_MODE);
      mapRef.current = map;
      setStatus('ready');
    });

    map.on('error', (event) => {
      // Once the style has loaded, a failed tile is not fatal; before that, the map is unusable.
      if (!map.loaded()) setStatus((current) => (current === 'loading' ? 'error' : current));
      if ('sourceId' in event && isDataSource(event.sourceId)) setHasDataError(true);
    });
    // A tile that arrives after a failure means the API is answering again.
    map.on('sourcedata', (event) => {
      if (event.tile !== undefined && isDataSource(event.sourceId)) setHasDataError(false);
    });

    map.on('click', CLUSTER_LAYER_ID, (event: MapLayerMouseEvent) => {
      const geometry = event.features?.[0]?.geometry as
        { type: string; coordinates?: unknown } | undefined;
      if (geometry?.type !== 'Point' || !Array.isArray(geometry.coordinates)) return;
      const [lon, lat] = geometry.coordinates as [unknown, unknown];
      if (typeof lon !== 'number' || typeof lat !== 'number') return;
      map.easeTo({ center: [lon, lat], zoom: map.getZoom() + CLUSTER_CLICK_ZOOM_STEP });
    });
    map.on('mouseenter', CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (status === 'ready' && mapRef.current !== null) setWellColorMode(mapRef.current, colorMode);
  }, [status, colorMode]);

  return (
    <div className="well-map">
      <div
        ref={containerRef}
        className="well-map__canvas"
        role="region"
        aria-label={messages.map.label}
        aria-busy={status === 'loading'}
      />
      {status === 'ready' && (
        <fieldset className="well-map__color-mode">
          <legend>{messages.map.colorMode.legend}</legend>
          {COLOR_MODES.map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                name="well-color-mode"
                value={mode}
                checked={colorMode === mode}
                onChange={() => {
                  setColorMode(mode);
                }}
              />
              {messages.map.colorMode[mode]}
            </label>
          ))}
        </fieldset>
      )}
      {status === 'loading' && (
        <p className="well-map__notice" role="status">
          {messages.map.loading}
        </p>
      )}
      {status === 'error' && (
        <p className="well-map__notice well-map__notice--error" role="alert">
          {messages.map.loadError}
        </p>
      )}
      {status === 'ready' && hasDataError && (
        <p className="well-map__notice well-map__notice--error" role="alert">
          {messages.map.dataError}
        </p>
      )}
    </div>
  );
}
