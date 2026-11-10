/** Free vector basemap without an access token (docs/03: MapLibre, "sin token"). */
const DEFAULT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
/** The API of `pnpm dev` and of `docker compose up`, as seen from the browser. */
const DEFAULT_API_URL = 'http://localhost:4000';

export const mapConfig = {
  // Both are inlined at build time.
  styleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULT_MAP_STYLE_URL,
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, ''),
  // Norwegian continental shelf, where the public data sources live (docs/10).
  initialCenter: { lon: 4.5, lat: 62.5 },
  initialZoom: 4.2,
  /** Field outlines appear from this zoom, so they do not clutter the overview (docs/03). */
  fieldMinZoom: 6,
  /** Field names need more room than their outlines. */
  fieldLabelMinZoom: 8,
  /** Above this zoom, tiles are overzoomed instead of requested: they already hold every well. */
  wellTileMaxZoom: 14,
  fieldTileMaxZoom: 12,
};
