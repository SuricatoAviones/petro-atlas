/**
 * Colours of the map symbols. MapLibre paints on a canvas and cannot read CSS custom properties,
 * so the palette lives here and is shared by the map layers and, later, by the legend.
 */
import type { WellStatus, WellType } from '@petroatlas/shared-types';

export type WellColorMode = 'status' | 'type';

export const WELL_COLOR_MODES: readonly WellColorMode[] = ['status', 'type'];

export const WELL_STATUS_COLORS: Record<WellStatus, string> = {
  producing: '#1a7f4b',
  injecting: '#1f6fb2',
  shut_in: '#d98a00',
  abandoned: '#6b7780',
  unknown: '#ffffff',
};

export const WELL_TYPE_COLORS: Record<WellType, string> = {
  producer: '#1a7f4b',
  injector: '#1f6fb2',
  exploration: '#b4491f',
  observation: '#7a4fa3',
};

/** A well whose source gives no type (`wellType` is null) or a value this build does not know. */
export const ALERT_CRITICAL_COLOR = '#b42318';
export const ALERT_WARNING_COLOR = '#b26a00';

export const WELL_FALLBACK_COLOR = '#ffffff';
/** Outline of every well symbol; it keeps the white ones visible on the light basemap. */
export const WELL_OUTLINE_COLOR = '#13212b';

export const CLUSTER_COLOR = '#12303a';
export const CLUSTER_TEXT_COLOR = '#ffffff';

/** Imported wells are a separate layer and must not be confused with the public ones. */
export const IMPORTED_WELL_COLOR = '#b45309';
export const IMPORTED_WELL_CENTER_COLOR = '#ffffff';

export const BUBBLE_COLORS = {
  oil: '#1a7f4b',
  gas: '#c0392b',
  water: '#1f6fb2',
} as const;

export const FIELD_FILL_COLOR = '#e0a526';
export const FIELD_OUTLINE_COLOR = '#8a6410';
export const FIELD_LABEL_COLOR = '#5c430b';
