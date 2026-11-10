/**
 * Sources and layers drawn on top of the basemap: field outlines, well clusters and wells, all
 * from the vector tiles of the API (docs/06, "Teselas de pozos" and "Teselas de campos").
 */
import type { WellCumulative } from '@petroatlas/shared-types';
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import { bubbleMaximum, bubbleRadius, bubbleValue, type BubbleFluid } from '@/lib/bubble';

import { mapConfig } from './map-config';
import {
  ALERT_CRITICAL_COLOR,
  ALERT_WARNING_COLOR,
  BUBBLE_COLORS,
  CLUSTER_COLOR,
  CLUSTER_TEXT_COLOR,
  FIELD_FILL_COLOR,
  FIELD_LABEL_COLOR,
  FIELD_OUTLINE_COLOR,
  IMPORTED_WELL_CENTER_COLOR,
  IMPORTED_WELL_COLOR,
  WELL_FALLBACK_COLOR,
  WELL_OUTLINE_COLOR,
  WELL_STATUS_COLORS,
  WELL_TYPE_COLORS,
  type WellColorMode,
} from './well-colors';

export const WELL_SOURCE_ID = 'wells';
export const FIELD_SOURCE_ID = 'fields';
export const CUMULATIVE_SOURCE_ID = 'cumulative';
export const CUMULATIVE_LAYER_ID = 'cumulative-bubbles';

export const WELL_LAYER_ID = 'wells-points';
export const CLUSTER_LAYER_ID = 'clusters-circles';
export const IMPORTED_SOURCE_ID = 'imported-wells';
export const IMPORTED_LAYER_ID = 'imported-wells-points';
export const IMPORTED_CENTER_LAYER_ID = 'imported-wells-center';
const CLUSTER_COUNT_LAYER_ID = 'clusters-count';
const FIELD_FILL_LAYER_ID = 'fields-fill';
const FIELD_OUTLINE_LAYER_ID = 'fields-outline';
const FIELD_LABEL_LAYER_ID = 'fields-label';

/** Font of OpenFreeMap's styles, used when the basemap style does not reveal its own. */
const FALLBACK_FONT = 'Noto Sans Regular';

/** `match` expression that paints each well by its status or by its type. */
export function wellColorExpression(mode: WellColorMode): ExpressionSpecification {
  const property = mode === 'status' ? 'status' : 'wellType';
  const colors = mode === 'status' ? WELL_STATUS_COLORS : WELL_TYPE_COLORS;
  // A null `wellType` is absent from the tile; `coalesce` lets it reach the fallback colour.
  return [
    'match',
    ['coalesce', ['get', property], ''],
    ...Object.entries(colors).flat(),
    WELL_FALLBACK_COLOR,
  ] as unknown as ExpressionSpecification;
}

/**
 * Text layers must use a font that the basemap's glyph server has, and the style is
 * configurable, so the font is taken from the first label layer of the loaded style.
 */
function basemapFont(map: MapLibreMap): string[] {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== 'symbol') continue;
    const font: unknown = layer.layout?.['text-font'];
    if (Array.isArray(font) && font.every((name) => typeof name === 'string')) return font;
  }
  return [FALLBACK_FONT];
}

/** Well tiles with the current filters, so cluster counts match the panel (docs/06). */
function wellTilesUrl(filterQuery: string): string {
  const suffix = filterQuery === '' ? '' : `?${filterQuery}`;
  return `${mapConfig.apiUrl}/api/tiles/wells/{z}/{x}/{y}.mvt${suffix}`;
}

/** Adds the field and well layers. Call it once, after the style has loaded. */
export function addWellLayers(
  map: MapLibreMap,
  colorMode: WellColorMode,
  filterQuery: string,
): void {
  const font = basemapFont(map);

  map.addSource(FIELD_SOURCE_ID, {
    type: 'vector',
    tiles: [`${mapConfig.apiUrl}/api/tiles/fields/{z}/{x}/{y}.mvt`],
    minzoom: mapConfig.fieldMinZoom,
    maxzoom: mapConfig.fieldTileMaxZoom,
  });
  map.addSource(WELL_SOURCE_ID, {
    type: 'vector',
    tiles: [wellTilesUrl(filterQuery)],
    maxzoom: mapConfig.wellTileMaxZoom,
  });

  map.addLayer({
    id: FIELD_FILL_LAYER_ID,
    type: 'fill',
    source: FIELD_SOURCE_ID,
    'source-layer': 'fields',
    minzoom: mapConfig.fieldMinZoom,
    paint: { 'fill-color': FIELD_FILL_COLOR, 'fill-opacity': 0.18 },
  });
  map.addLayer({
    id: FIELD_OUTLINE_LAYER_ID,
    type: 'line',
    source: FIELD_SOURCE_ID,
    'source-layer': 'fields',
    minzoom: mapConfig.fieldMinZoom,
    paint: { 'line-color': FIELD_OUTLINE_COLOR, 'line-width': 1.25 },
  });

  map.addLayer({
    id: WELL_LAYER_ID,
    type: 'circle',
    source: WELL_SOURCE_ID,
    'source-layer': 'wells',
    paint: {
      'circle-color': wellColorExpression(colorMode),
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 9, 4.5, 14, 7],
      'circle-stroke-color': [
        'case',
        ['==', ['get', 'alertLevel'], 'critical'],
        ALERT_CRITICAL_COLOR,
        ['==', ['get', 'alertLevel'], 'warning'],
        ALERT_WARNING_COLOR,
        WELL_OUTLINE_COLOR,
      ],
      'circle-stroke-width': [
        'case',
        ['==', ['get', 'alertLevel'], 'critical'],
        2.5,
        ['==', ['get', 'alertLevel'], 'warning'],
        1.75,
        1,
      ],
    },
  });

  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: 'circle',
    source: WELL_SOURCE_ID,
    'source-layer': 'clusters',
    paint: {
      'circle-color': CLUSTER_COLOR,
      'circle-opacity': 0.88,
      'circle-radius': ['step', ['get', 'pointCount'], 11, 10, 14, 100, 18, 1000, 23],
      'circle-stroke-color': [
        'case',
        ['==', ['get', 'alertLevel'], 'critical'],
        ALERT_CRITICAL_COLOR,
        ['==', ['get', 'alertLevel'], 'warning'],
        ALERT_WARNING_COLOR,
        CLUSTER_TEXT_COLOR,
      ],
      'circle-stroke-width': [
        'case',
        ['==', ['get', 'alertLevel'], 'critical'],
        3,
        ['==', ['get', 'alertLevel'], 'warning'],
        2,
        1.5,
      ],
    },
  });
  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: WELL_SOURCE_ID,
    'source-layer': 'clusters',
    layout: {
      'text-field': ['to-string', ['get', 'pointCount']],
      'text-font': font,
      'text-size': 11,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: { 'text-color': CLUSTER_TEXT_COLOR },
  });

  map.addLayer({
    id: FIELD_LABEL_LAYER_ID,
    type: 'symbol',
    source: FIELD_SOURCE_ID,
    'source-layer': 'fields',
    minzoom: mapConfig.fieldLabelMinZoom,
    layout: { 'text-field': ['get', 'name'], 'text-font': font, 'text-size': 12 },
    paint: {
      'text-color': FIELD_LABEL_COLOR,
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.5,
    },
  });

  // Imported wells are a GeoJSON layer of their own: an amber ring with a centre dot, so they
  // read as a different symbol from the public wells (docs/09).
  map.addSource(IMPORTED_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  map.addLayer({
    id: IMPORTED_LAYER_ID,
    type: 'circle',
    source: IMPORTED_SOURCE_ID,
    paint: {
      'circle-color': IMPORTED_WELL_COLOR,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 5, 9, 7, 14, 10],
      'circle-stroke-color': WELL_OUTLINE_COLOR,
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: IMPORTED_CENTER_LAYER_ID,
    type: 'circle',
    source: IMPORTED_SOURCE_ID,
    paint: {
      'circle-color': IMPORTED_WELL_CENTER_COLOR,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 1.5, 9, 2, 14, 3],
    },
  });
}

/** A well imported in this browser, as the map needs it. */
export interface ImportedWellPoint {
  slug: string;
  name: string;
  latDeg: number;
  lonDeg: number;
}

/** Replaces the points of the imported wells layer. */
export function setImportedWells(map: MapLibreMap, wells: readonly ImportedWellPoint[]): void {
  const source = map.getSource<GeoJSONSource>(IMPORTED_SOURCE_ID);
  if (source === undefined) return;
  void source.setData({
    type: 'FeatureCollection',
    features: wells.map((well) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [well.lonDeg, well.latDeg] as [number, number],
      },
      properties: { slug: well.slug, name: well.name },
    })),
  });
}

export function setWellColorMode(map: MapLibreMap, colorMode: WellColorMode): void {
  map.setPaintProperty(WELL_LAYER_ID, 'circle-color', wellColorExpression(colorMode));
}

const DATA_LAYER_IDS: readonly string[] = [
  IMPORTED_CENTER_LAYER_ID,
  IMPORTED_LAYER_ID,
  FIELD_LABEL_LAYER_ID,
  WELL_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  CLUSTER_LAYER_ID,
  FIELD_OUTLINE_LAYER_ID,
  FIELD_FILL_LAYER_ID,
];
const DATA_SOURCE_IDS: readonly string[] = [IMPORTED_SOURCE_ID, FIELD_SOURCE_ID, WELL_SOURCE_ID];

/**
 * Points the data sources at the tile URL of the new filter set. MapLibre keeps the cached
 * tiles of a source whose `tiles` change, so the layers and sources are rebuilt instead of
 * calling `setTiles`: otherwise the map would keep drawing the previous filter's wells.
 */
export function setWellFilters(
  map: MapLibreMap,
  filterQuery: string,
  colorMode: WellColorMode,
): void {
  for (const layerId of DATA_LAYER_IDS) {
    if (map.getLayer(layerId) !== undefined) map.removeLayer(layerId);
  }
  for (const sourceId of DATA_SOURCE_IDS) {
    if (map.getSource(sourceId) !== undefined) map.removeSource(sourceId);
  }
  addWellLayers(map, colorMode, filterQuery);
}

export interface BubbleLayerState {
  fluid: BubbleFluid;
  items: readonly WellCumulative[];
}

function setDataLayersVisibility(map: MapLibreMap, visible: boolean): void {
  for (const layerId of [WELL_LAYER_ID, CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID]) {
    if (map.getLayer(layerId) !== undefined) {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  }
}

/** Replaces the well points with cumulative-production bubbles, or removes them. */
export function setBubbleLayer(map: MapLibreMap, bubbles: BubbleLayerState | null): void {
  if (map.getLayer(CUMULATIVE_LAYER_ID) !== undefined) map.removeLayer(CUMULATIVE_LAYER_ID);
  if (map.getSource(CUMULATIVE_SOURCE_ID) !== undefined) map.removeSource(CUMULATIVE_SOURCE_ID);
  if (bubbles === null) {
    setDataLayersVisibility(map, true);
    return;
  }

  const maximum = bubbleMaximum(bubbles.items, bubbles.fluid);
  const features = bubbles.items.flatMap((item) => {
    const value = bubbleValue(item, bubbles.fluid);
    if (value === null || value <= 0) return [];
    return [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [item.lonDeg, item.latDeg] as [number, number],
        },
        properties: {
          name: item.name,
          value,
          radius: bubbleRadius(value, maximum),
        },
      },
    ];
  });

  map.addSource(CUMULATIVE_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  });
  map.addLayer({
    id: CUMULATIVE_LAYER_ID,
    type: 'circle',
    source: CUMULATIVE_SOURCE_ID,
    paint: {
      'circle-radius': ['get', 'radius'],
      'circle-color': BUBBLE_COLORS[bubbles.fluid],
      'circle-opacity': 0.55,
      'circle-stroke-color': WELL_OUTLINE_COLOR,
      'circle-stroke-width': 1,
    },
  });
  setDataLayersVisibility(map, false);
}
