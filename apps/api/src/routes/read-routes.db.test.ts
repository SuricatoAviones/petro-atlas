/**
 * Route tests against the seeded development database (docs/12: "Vitest + base de datos de
 * prueba"). They only assert on the synthetic field, so extra data loaded by the ETL is harmless.
 */
import {
  alertListResponseSchema,
  apiErrorSchema,
  fieldDetailSchema,
  fieldListResponseSchema,
  fieldProductionResponseSchema,
  sourceListResponseSchema,
  wellCollectionResponseSchema,
  wellCumulativeResponseSchema,
  wellDetailSchema,
  wellProductionResponseSchema,
  wellTrajectoryResponseSchema,
} from '@petroatlas/shared-types';
import { beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '../database.ts';
import { SEED_FIELD_SLUG, connectToSeededDatabase, getJson, startApi } from '../test-support.ts';

let database: Database;

beforeAll(async () => {
  database = await connectToSeededDatabase();
});

async function get(path: string) {
  return getJson(await startApi({ database }), `/api${path}`);
}

async function expectError(path: string, status: number, code: string): Promise<void> {
  const response = await get(path);
  expect(response.status).toBe(status);
  expect(apiErrorSchema.parse(response.body).error.code).toBe(code);
}

const seedWells = `/wells?field=${SEED_FIELD_SLUG}`;

describe('GET /api/fields', () => {
  it('lists fields with operator, status and well count', async () => {
    const { status, body, headers } = await get('/fields?limit=1000');
    const seedField = fieldListResponseSchema
      .parse(body)
      .items.find((field) => field.slug === SEED_FIELD_SLUG);

    expect(status).toBe(200);
    expect(headers.get('cache-control')).toBe('public, max-age=300');
    expect(seedField).toMatchObject({
      name: 'SYNTHETIC ALPHA',
      operator: 'Demo Operator (fictitious)',
      status: 'producing',
      wellCount: 20,
    });
  });

  it('filters by status', async () => {
    const shutDown = fieldListResponseSchema.parse((await get('/fields?status=shut_down')).body);
    const producing = fieldListResponseSchema.parse(
      (await get('/fields?status=producing,approved&limit=1000')).body,
    );

    expect(shutDown.items.map((field) => field.slug)).not.toContain(SEED_FIELD_SLUG);
    expect(producing.items.map((field) => field.slug)).toContain(SEED_FIELD_SLUG);
  });

  it.each(['/fields?status=exploded', '/fields?limit=0', '/fields?limit=5000', '/fields?cursor=x'])(
    'responds 400 INVALID_PARAMS for %s',
    async (path) => {
      await expectError(path, 400, 'INVALID_PARAMS');
    },
  );
});

describe('GET /api/fields/:id', () => {
  it('returns the field with its polygon, by slug and by id', async () => {
    const bySlug = fieldDetailSchema.parse((await get(`/fields/${SEED_FIELD_SLUG}`)).body);
    const byId = fieldDetailSchema.parse((await get(`/fields/${String(bySlug.id)}`)).body);

    expect(byId).toEqual(bySlug);
    expect(bySlug.wellCount).toBe(20);
    expect(bySlug.geometry?.type).toBe('MultiPolygon');
    expect(bySlug.geometry?.coordinates[0]?.[0]).toHaveLength(5);
    expect(bySlug.totals.oilSm3).toBeGreaterThan(0);
    expect(bySlug.totals.gasSm3).toBeGreaterThan(0);
    expect(bySlug.totals.waterSm3).toBeGreaterThanOrEqual(0);
    expect(bySlug.source.name).toBe('PetroAtlas synthetic seed');
  });

  it('responds 404 FIELD_NOT_FOUND for an unknown field', async () => {
    await expectError('/fields/no-such-field', 404, 'FIELD_NOT_FOUND');
    await expectError('/fields/999999999', 404, 'FIELD_NOT_FOUND');
  });
});

describe('GET /api/wells', () => {
  it('returns a GeoJSON FeatureCollection with the documented properties', async () => {
    const { status, body } = await get(seedWells);
    const collection = wellCollectionResponseSchema.parse(body);
    const first = collection.features.find((feature) => feature.properties.name === 'SYN-A-01');
    const exploration = collection.features.find(
      (feature) => feature.properties.name === 'SYN-A-20',
    );

    expect(status).toBe(200);
    expect(collection.totalCount).toBe(20);
    expect(collection.features).toHaveLength(20);
    expect(collection.nextCursor).toBeNull();
    expect(first?.properties).toMatchObject({
      slug: 'SYN-A-01',
      wellType: 'producer',
      status: 'producing',
      fieldName: 'SYNTHETIC ALPHA',
      alertLevel: null,
      hasDailyData: true,
    });
    expect(exploration?.properties.hasDailyData).toBe(false);
    const shutIn = collection.features.find((feature) => feature.properties.name === 'SYN-A-14');
    expect(shutIn?.properties.alertLevel).toBe('critical');
  });

  it('pages through results with a cursor, without repeating or skipping wells', async () => {
    const names: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const suffix: string = cursor === null ? '' : `&cursor=${cursor}`;
      const page = wellCollectionResponseSchema.parse(
        (await get(`${seedWells}&limit=7${suffix}`)).body,
      );
      expect(page.totalCount).toBe(20);
      names.push(...page.features.map((feature) => feature.properties.name));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor !== null);

    expect(pages).toBe(3);
    expect(new Set(names).size).toBe(20);
  });

  it.each([
    ['type=injector', 4],
    ['type=injector,observation', 5],
    ['status=shut_in', 1],
    ['status=abandoned&type=exploration', 1],
    ['status=producing&type=injector', 0],
    [`operator=${encodeURIComponent('Demo Operator (fictitious)')}`, 20],
    ['operator=Nobody', 0],
    ['spudFrom=2018-01-01&spudTo=2023-12-31', 20],
    ['spudFrom=2030-01-01', 0],
    ['bbox=2.9,64.55,3.1,64.65', 20],
    ['bbox=0,0,1,1', 0],
  ])('filters with %s', async (filters, expectedCount) => {
    const collection = wellCollectionResponseSchema.parse(
      (await get(`${seedWells}&${filters}`)).body,
    );

    expect(collection.totalCount).toBe(expectedCount);
    expect(collection.features).toHaveLength(expectedCount);
  });

  it('accepts a field id as well as a slug', async () => {
    const field = fieldDetailSchema.parse((await get(`/fields/${SEED_FIELD_SLUG}`)).body);
    const collection = wellCollectionResponseSchema.parse(
      (await get(`/wells?field=${String(field.id)}`)).body,
    );

    expect(collection.totalCount).toBe(20);
  });

  it.each([
    'bbox=1,2,3',
    'bbox=3,64,2,65',
    'bbox=a,b,c,d',
    'bbox=0,0,1,100',
    'type=rocket',
    'status=',
    'spudFrom=2020',
    'spudTo=31-12-2020',
    'limit=abc',
  ])('responds 400 INVALID_PARAMS for %s', async (filters) => {
    await expectError(`/wells?${filters}`, 400, 'INVALID_PARAMS');
  });
});

describe('GET /api/wells/cumulative', () => {
  it('returns accumulated volumes per well and accepts the well filters', async () => {
    const all = wellCumulativeResponseSchema.parse(
      (await get(`/wells/cumulative?field=${SEED_FIELD_SLUG}`)).body,
    );
    const producer = all.items.find((item) => item.name === 'SYN-A-01');
    const injectors = wellCumulativeResponseSchema.parse(
      (await get(`/wells/cumulative?field=${SEED_FIELD_SLUG}&type=injector`)).body,
    );

    expect(all.items).toHaveLength(20);
    expect(producer?.oilSm3).toBeGreaterThan(0);
    expect(producer?.gasSm3).toBeGreaterThan(0);
    expect(injectors.items).toHaveLength(4);
    expect(injectors.items.every((item) => item.oilSm3 === null)).toBe(true);
  });

  it('filters by bounding box', async () => {
    const body = wellCumulativeResponseSchema.parse(
      (await get('/wells/cumulative?bbox=2.9,64.55,3.1,64.65')).body,
    );

    expect(body.items).toHaveLength(20);
  });

  it('responds 400 INVALID_PARAMS for an invalid bounding box', async () => {
    await expectError('/wells/cumulative?bbox=3,64,2,65', 400, 'INVALID_PARAMS');
  });
});

describe('GET /api/wells/:id', () => {
  it('returns metadata and the available series, by slug and by id', async () => {
    const bySlug = wellDetailSchema.parse((await get('/wells/SYN-A-01')).body);
    const byId = wellDetailSchema.parse((await get(`/wells/${String(bySlug.id)}`)).body);

    expect(byId).toEqual(bySlug);
    expect(bySlug).toMatchObject({
      name: 'SYN-A-01',
      wellType: 'producer',
      status: 'producing',
      field: { slug: SEED_FIELD_SLUG, operator: 'Demo Operator (fictitious)' },
      series: {
        daily: { from: '2025-01-01', to: '2025-12-31', days: 365 },
        hasTrajectory: true,
        logCurves: [],
      },
      source: { name: 'PetroAtlas synthetic seed' },
    });
    expect(bySlug.spudDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(bySlug.totalDepthM).toBeGreaterThan(2000);
    expect(bySlug.location.latDeg).toBeCloseTo(64.6, 0);
  });

  it('reports a well without daily data as such', async () => {
    const well = wellDetailSchema.parse((await get('/wells/SYN-A-20')).body);

    expect(well.series.daily).toBeNull();
  });

  it('responds 404 WELL_NOT_FOUND for an unknown well', async () => {
    await expectError('/wells/NO-SUCH-WELL', 404, 'WELL_NOT_FOUND');
    await expectError('/wells/999999999', 404, 'WELL_NOT_FOUND');
  });
});

describe('GET /api/wells/:id/production', () => {
  it('returns the daily series in columns with its source', async () => {
    const well = wellDetailSchema.parse((await get('/wells/SYN-A-01')).body);
    const { status, body } = await get('/wells/SYN-A-01/production?from=2025-01-01&to=2025-01-03');
    const production = wellProductionResponseSchema.parse(body);

    expect(status).toBe(200);
    expect(production).toMatchObject({
      wellId: well.id,
      interval: 'day',
      source: { name: 'PetroAtlas synthetic seed' },
    });
    expect(production.dates).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
    expect(production.series.oil).toHaveLength(3);
    expect(production.series.oil[0]).toBeGreaterThan(0);
    expect(production.series.bhp[0]).not.toBeNull();
  });

  it('aggregates the series by month', async () => {
    const production = wellProductionResponseSchema.parse(
      (await get('/wells/SYN-A-01/production?interval=month')).body,
    );

    expect(production.interval).toBe('month');
    expect(production.dates).toHaveLength(12);
    expect(production.dates[0]).toBe('2025-01-01');
    expect(production.series.oil).toHaveLength(12);
    expect(production.series.oil.every((value) => value !== null)).toBe(true);
  });

  it.each([
    '/wells/SYN-A-01/production?from=2025-13-01',
    '/wells/SYN-A-01/production?interval=week',
    '/wells/SYN-A-01/production?from=2025-02-01&to=2025-01-01',
  ])('responds 400 INVALID_PARAMS for %s', async (path) => {
    await expectError(path, 400, 'INVALID_PARAMS');
  });

  it('responds 404 WELL_NOT_FOUND for an unknown well', async () => {
    await expectError('/wells/NO-SUCH-WELL/production', 404, 'WELL_NOT_FOUND');
  });
});

describe('GET /api/wells/:id/trajectory', () => {
  it('returns the stations in measured-depth order', async () => {
    const well = wellDetailSchema.parse((await get('/wells/SYN-A-01')).body);
    const trajectory = wellTrajectoryResponseSchema.parse(
      (await get('/wells/SYN-A-01/trajectory')).body,
    );

    expect(trajectory).toMatchObject({
      wellId: well.id,
      source: { name: 'PetroAtlas synthetic seed' },
    });
    expect(trajectory.stations.length).toBeGreaterThan(1);
    expect(trajectory.stations[0]?.mdM).toBe(0);
    expect(trajectory.stations.at(-1)?.mdM).toBe(well.totalDepthM);
  });

  it('responds 404 WELL_NOT_FOUND for an unknown well', async () => {
    await expectError('/wells/NO-SUCH-WELL/trajectory', 404, 'WELL_NOT_FOUND');
  });
});

describe('GET /api/fields/:id/production', () => {
  it('returns the monthly field series in columns', async () => {
    const field = fieldDetailSchema.parse((await get(`/fields/${SEED_FIELD_SLUG}`)).body);
    const production = fieldProductionResponseSchema.parse(
      (await get(`/fields/${SEED_FIELD_SLUG}/production`)).body,
    );

    expect(production).toMatchObject({
      fieldId: field.id,
      interval: 'month',
      source: { name: 'PetroAtlas synthetic seed' },
    });
    expect(production.dates).toHaveLength(12);
    expect(production.dates[0]).toBe('2025-01-01');
    expect(production.series.oil).toHaveLength(12);
  });

  it('filters by month range', async () => {
    const production = fieldProductionResponseSchema.parse(
      (await get(`/fields/${SEED_FIELD_SLUG}/production?from=2025-02-01&to=2025-03-31`)).body,
    );

    expect(production.dates).toEqual(['2025-02-01', '2025-03-01']);
  });

  it.each([
    `/fields/${SEED_FIELD_SLUG}/production?interval=day`,
    `/fields/${SEED_FIELD_SLUG}/production?from=2025-02-01&to=2025-01-01`,
  ])('responds 400 INVALID_PARAMS for %s', async (path) => {
    await expectError(path, 400, 'INVALID_PARAMS');
  });

  it('responds 404 FIELD_NOT_FOUND for an unknown field', async () => {
    await expectError('/fields/no-such-field/production', 404, 'FIELD_NOT_FOUND');
  });
});

describe('GET /api/alerts', () => {
  it('lists active alerts, critical first, with their details', async () => {
    const { status, body } = await get('/alerts');
    const alerts = alertListResponseSchema.parse(body);
    const shutIn = alerts.items.find((item) => item.wellName === 'SYN-A-14');
    const levels = alerts.items.map((item) => item.level);

    expect(status).toBe(200);
    expect(alerts.asOfByWell).toBe(true);
    expect(shutIn).toMatchObject({ level: 'critical' });
    expect(shutIn?.kinds).toContain('no_production');
    expect(shutIn?.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const firstWarning = levels.indexOf('warning');
    const lastCritical = levels.lastIndexOf('critical');
    if (firstWarning !== -1 && lastCritical !== -1) {
      expect(firstWarning).toBeGreaterThan(lastCritical);
    }
  });

  it('filters by field and level', async () => {
    const field = alertListResponseSchema.parse(
      (await get(`/alerts?field=${SEED_FIELD_SLUG}`)).body,
    );
    const critical = alertListResponseSchema.parse((await get('/alerts?level=critical')).body);

    expect(field.items.every((item) => item.wellName.startsWith('SYN-'))).toBe(true);
    expect(critical.items.every((item) => item.level === 'critical')).toBe(true);
  });

  it('responds 400 INVALID_PARAMS for an invalid level', async () => {
    await expectError('/alerts?level=urgent', 400, 'INVALID_PARAMS');
  });
});

describe('GET /api/meta/sources', () => {
  it('lists the data sources with licence and last ingest', async () => {
    const { status, body } = await get('/meta/sources');
    const seedSource = sourceListResponseSchema
      .parse(body)
      .items.find((source) => source.name === 'PetroAtlas synthetic seed');

    expect(status).toBe(200);
    expect(seedSource?.license).toContain('Synthetic');
    expect(seedSource?.ingestedAt).not.toBeNull();
  });
});
