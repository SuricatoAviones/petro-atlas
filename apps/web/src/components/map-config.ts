/** Free vector basemap without an access token (docs/03: MapLibre, "sin token"). */
const DEFAULT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

export const mapConfig = {
  // Inlined at build time; override it to use another MapLibre style.
  styleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULT_MAP_STYLE_URL,
  // Norwegian continental shelf, where the public data sources live (docs/10).
  initialCenter: { lon: 4.5, lat: 62.5 },
  initialZoom: 4.2,
};
