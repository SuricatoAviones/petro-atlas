/** Tile tests against the seeded development database; they only look at the synthetic field. */
import { VectorTile } from '@mapbox/vector-tile';
import { apiErrorSchema } from '@petroatlas/shared-types';
import { PbfReader } from 'pbf';
import { beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '../database.ts';
import { SEED_FIELD_SLUG, connectToSeededDatabase, startApi } from '../test-support.ts';
import { CLUSTER_MAX_ZOOM } from './tiles.ts';

// Corners of the synthetic field (db/seed/generate.ts).
const FIELD_BOUNDS = { minLon: 2.9, maxLon: 3.1, minLat: 64.55, maxLat: 64.65 };

let baseUrl: string;
let database: Database;

beforeAll(async () => {
  database = await connectToSeededDatabase();
});

function tileColumn(lonDeg: number, zoom: number): number {
  return Math.floor(((lonDeg + 180) / 360) * 2 ** zoom);
}

function tileRow(latDeg: number, zoom: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * 2 ** zoom);
}

/** Every tile at `zoom` that touches the synthetic field. */
function fieldTiles(zoom: number): string[] {
  const tiles: string[] = [];
  const { minLon, maxLon, minLat, maxLat } = FIELD_BOUNDS;
  for (let x = tileColumn(minLon, zoom); x <= tileColumn(maxLon, zoom); x += 1) {
    for (let y = tileRow(maxLat, zoom); y <= tileRow(minLat, zoom); y += 1) {
      tiles.push(`${String(zoom)}/${String(x)}/${String(y)}`);
    }
  }
  return tiles;
}

interface DecodedTile {
  status: number;
  contentType: string | null;
  cacheControl: string | null;
  clusters: { pointCount: unknown }[];
  wells: { id: number; properties: Record<string, unknown> }[];
}

async function getTile(tile: string, query = `field=${SEED_FIELD_SLUG}`): Promise<DecodedTile> {
  baseUrl = await startApi({ database });
  const response = await fetch(`${baseUrl}/api/tiles/wells/${tile}.mvt?${query}`);
  const decoded: DecodedTile = {
    status: response.status,
    contentType: response.headers.get('content-type'),
    cacheControl: response.headers.get('cache-control'),
    clusters: [],
    wells: [],
  };
  if (response.status !== 200) return decoded;

  const { layers } = new VectorTile(new PbfReader(await response.arrayBuffer()));
  const clusterLayer = layers.clusters;
  for (let index = 0; index < (clusterLayer?.length ?? 0); index += 1) {
    const feature = clusterLayer?.feature(index);
    if (feature !== undefined) decoded.clusters.push({ pointCount: feature.properties.pointCount });
  }
  const wellLayer = layers.wells;
  for (let index = 0; index < (wellLayer?.length ?? 0); index += 1) {
    const feature = wellLayer?.feature(index);
    if (feature?.id !== undefined) {
      decoded.wells.push({ id: feature.id, properties: feature.properties });
    }
  }
  return decoded;
}

/** Wells represented in the tiles: every single well plus the count of every cluster. */
async function countWells(zoom: number, query?: string): Promise<number> {
  const wellIds = new Set<number>();
  let clustered = 0;
  for (const tile of fieldTiles(zoom)) {
    const decoded = await getTile(tile, query);
    for (const well of decoded.wells) wellIds.add(well.id);
    for (const cluster of decoded.clusters) clustered += Number(cluster.pointCount);
  }
  return wellIds.size + clustered;
}

describe('GET /api/tiles/wells/:z/:x/:y.mvt', () => {
  it('serves a vector tile with cache headers', async () => {
    const [tile = ''] = fieldTiles(6);
    const decoded = await getTile(tile);

    expect(decoded.status).toBe(200);
    expect(decoded.contentType).toBe('application/vnd.mapbox-vector-tile');
    expect(decoded.cacheControl).toBe('public, max-age=300');
  });

  it('groups wells into clusters at low zoom without losing or repeating any', async () => {
    const [tile = ''] = fieldTiles(6);
    const decoded = await getTile(tile);

    expect(decoded.clusters.length).toBeGreaterThan(0);
    expect(await countWells(6)).toBe(20);
    expect(await countWells(CLUSTER_MAX_ZOOM)).toBe(20);
  });

  it('serves every well as its own feature above the cluster zoom', async () => {
    const zoom = CLUSTER_MAX_ZOOM + 4;
    const wells = (await Promise.all(fieldTiles(zoom).map((tile) => getTile(tile)))).flatMap(
      (decoded) => {
        expect(decoded.clusters).toHaveLength(0);
        return decoded.wells;
      },
    );
    const byName = new Map(wells.map((well) => [well.properties.name, well.properties]));

    expect(byName.size).toBe(20);
    expect(byName.get('SYN-A-01')).toEqual({
      name: 'SYN-A-01',
      slug: 'SYN-A-01',
      wellType: 'producer',
      status: 'producing',
    });
    expect(byName.get('SYN-A-14')?.alertLevel).toBe('critical');
  });

  it('applies the same filters as GET /api/wells', async () => {
    const field = `field=${SEED_FIELD_SLUG}`;

    expect(await countWells(6, `${field}&type=injector`)).toBe(4);
    expect(await countWells(12, `${field}&type=injector`)).toBe(4);
    expect(await countWells(12, `${field}&status=shut_in`)).toBe(1);
    expect(await countWells(6, `${field}&spudFrom=2030-01-01`)).toBe(0);
  });

  it('responds 204 for a tile without wells', async () => {
    const decoded = await getTile('5/0/0');

    expect(decoded.status).toBe(204);
  });

  it.each([
    ['23/0/0', ''],
    ['2/4/0', ''],
    ['2/0/4', ''],
    ['2/a/0', ''],
    ['2/-1/0', ''],
    ['6/32/17', 'status=exploded'],
    ['6/32/17', 'spudTo=tomorrow'],
  ])('responds 400 INVALID_PARAMS for %s?%s', async (tile, query) => {
    baseUrl = await startApi({ database });
    const response = await fetch(`${baseUrl}/api/tiles/wells/${tile}.mvt?${query}`);

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe('INVALID_PARAMS');
  });
});

describe('GET /api/tiles/fields/:z/:x/:y.mvt', () => {
  async function getFieldTile(tile: string) {
    baseUrl = await startApi({ database });
    const response = await fetch(`${baseUrl}/api/tiles/fields/${tile}.mvt`);
    const fields: { id: number | undefined; type: number; properties: Record<string, unknown> }[] =
      [];
    if (response.status === 200) {
      const layer = new VectorTile(new PbfReader(await response.arrayBuffer())).layers.fields;
      for (let index = 0; index < (layer?.length ?? 0); index += 1) {
        const feature = layer?.feature(index);
        if (feature !== undefined) {
          fields.push({ id: feature.id, type: feature.type, properties: feature.properties });
        }
      }
    }
    return { response, fields };
  }

  it('serves the field outline as a polygon with its attributes', async () => {
    const [tile = ''] = fieldTiles(8);
    const { response, fields } = await getFieldTile(tile);
    const field = fields.find((candidate) => candidate.properties.slug === SEED_FIELD_SLUG);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/vnd.mapbox-vector-tile');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(field?.id).toEqual(expect.any(Number));
    // 3 is the polygon geometry type of the vector tile specification.
    expect(field?.type).toBe(3);
    expect(field?.properties).toEqual({
      name: expect.any(String) as unknown,
      slug: SEED_FIELD_SLUG,
      status: 'producing',
    });
  });

  it('responds 204 for a tile without fields', async () => {
    const { response } = await getFieldTile('5/0/0');

    expect(response.status).toBe(204);
  });

  it.each(['23/0/0', '2/4/0', '2/a/0'])('responds 400 INVALID_PARAMS for %s', async (tile) => {
    const { response } = await getFieldTile(tile);

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe('INVALID_PARAMS');
  });
});

describe('compression', () => {
  // Seed tiles are below the 1 kB threshold, so the assertion is on the GeoJSON list.
  it('compresses responses for clients that accept it', async () => {
    baseUrl = await startApi({ database });
    const wells = await fetch(`${baseUrl}/api/wells?limit=1000`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });

    expect(wells.headers.get('content-encoding')).toBe('gzip');
  });
});
