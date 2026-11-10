'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import {
  Map as MapLibreMap,
  type MapGeoJSONFeature,
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
  WELL_LAYER_ID,
  WELL_SOURCE_ID,
  addWellLayers,
  setWellColorMode,
  setWellFilters,
} from './well-layers';

type MapStatus = 'loading' | 'ready' | 'error';

/** Zoom levels gained by clicking a cluster. */
const CLUSTER_CLICK_ZOOM_STEP = 2;

const DATA_SOURCE_IDS: readonly string[] = [WELL_SOURCE_ID, FIELD_SOURCE_ID];

function isDataSource(sourceId: unknown): boolean {
  return typeof sourceId === 'string' && DATA_SOURCE_IDS.includes(sourceId);
}

export interface WellAtPoint {
  id: number;
  name: string;
  slug: string;
}

function readStringProperty(properties: unknown, key: string): string | null {
  if (typeof properties !== 'object' || properties === null) return null;
  const value = (properties as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

/** Unique wells among the features under a click; several can share the same coordinates. */
function wellsAtPoint(features: readonly MapGeoJSONFeature[] | undefined): WellAtPoint[] {
  const seen = new Set<number>();
  const wells: WellAtPoint[] = [];
  for (const feature of features ?? []) {
    if (typeof feature.id !== 'number' || seen.has(feature.id)) continue;
    const name = readStringProperty(feature.properties, 'name');
    const slug = readStringProperty(feature.properties, 'slug');
    if (name === null || slug === null) continue;
    seen.add(feature.id);
    wells.push({ id: feature.id, name, slug });
  }
  return wells;
}

export interface WellMapProps {
  colorMode: WellColorMode;
  /** Query string of the filters shared by the count and the tiles (docs/06). */
  filtersQuery: string;
  onSelectWells: (wells: readonly WellAtPoint[]) => void;
}

/** Full-size map of wells, grouped at low zoom, with field outlines from a zoom level on. */
export function WellMap({ colorMode, filtersQuery, onSelectWells }: WellMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap>(null);
  const latestColorMode = useRef(colorMode);
  const latestFiltersQuery = useRef(filtersQuery);
  const latestOnSelectWells = useRef(onSelectWells);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [hasDataError, setHasDataError] = useState(false);

  useEffect(() => {
    latestColorMode.current = colorMode;
  }, [colorMode]);

  useEffect(() => {
    latestFiltersQuery.current = filtersQuery;
  }, [filtersQuery]);

  useEffect(() => {
    latestOnSelectWells.current = onSelectWells;
  }, [onSelectWells]);

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
      addWellLayers(map, latestColorMode.current, latestFiltersQuery.current);
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
    map.on('click', WELL_LAYER_ID, (event: MapLayerMouseEvent) => {
      const wells = wellsAtPoint(event.features);
      if (wells.length > 0) latestOnSelectWells.current(wells);
    });
    for (const layerId of [CLUSTER_LAYER_ID, WELL_LAYER_ID]) {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (status === 'ready' && mapRef.current !== null) setWellColorMode(mapRef.current, colorMode);
  }, [status, colorMode]);

  useEffect(() => {
    if (status === 'ready' && mapRef.current !== null) setWellFilters(mapRef.current, filtersQuery);
  }, [status, filtersQuery]);

  return (
    <div className="well-map">
      <div
        ref={containerRef}
        className="well-map__canvas"
        role="region"
        aria-label={messages.map.label}
        aria-busy={status === 'loading'}
      />
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
