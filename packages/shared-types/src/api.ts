/**
 * Response bodies of the read routes in docs/06-api.md. The API builds its responses with these
 * schemas and the web validates what it receives with the same ones.
 *
 * Values are in SI and carry the unit in the property name. Dates are ISO 8601 strings.
 */
import { z } from 'zod';

import { fieldStatusSchema, wellStatusSchema, wellTypeSchema } from './domain.ts';

const isoDateSchema = z.iso.date();

/** Opaque pagination cursor: pass it back as `?cursor=`. Null on the last page. */
const nextCursorSchema = z.string().nullable();

export const sourceRefSchema = z.object({
  name: z.string(),
  license: z.string(),
  url: z.string(),
});
export type SourceRef = z.infer<typeof sourceRefSchema>;

// --- GeoJSON (EPSG:4326, [lon, lat]) ---

const positionSchema = z.tuple([z.number(), z.number()]);

export const pointSchema = z.object({
  type: z.literal('Point'),
  coordinates: positionSchema,
});

export const multiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(positionSchema))),
});

// --- Fields ---

export const fieldSummarySchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  operator: z.string().nullable(),
  status: fieldStatusSchema,
  wellCount: z.number().int(),
});
export type FieldSummary = z.infer<typeof fieldSummarySchema>;

/** `GET /api/fields` */
export const fieldListResponseSchema = z.object({
  items: z.array(fieldSummarySchema),
  nextCursor: nextCursorSchema,
});
export type FieldListResponse = z.infer<typeof fieldListResponseSchema>;

/** `GET /api/fields/:id` */
export const fieldDetailSchema = fieldSummarySchema.extend({
  geometry: multiPolygonSchema.nullable(),
  /** Cumulative production from the monthly field series; null while none is loaded. */
  totals: z.object({
    oilSm3: z.number().nullable(),
    gasSm3: z.number().nullable(),
    waterSm3: z.number().nullable(),
  }),
  source: sourceRefSchema,
});
export type FieldDetail = z.infer<typeof fieldDetailSchema>;

// --- Wells ---

export const wellFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.number().int(),
  geometry: pointSchema,
  properties: z.object({
    name: z.string(),
    slug: z.string(),
    wellType: wellTypeSchema.nullable(),
    status: wellStatusSchema,
    fieldId: z.number().int().nullable(),
    fieldName: z.string().nullable(),
    /** Filled from the `well_alert` view in phase 2; always null until then. */
    alertLevel: z.enum(['warning', 'critical']).nullable(),
    hasDailyData: z.boolean(),
  }),
});
export type WellFeature = z.infer<typeof wellFeatureSchema>;

/** `GET /api/wells` */
export const wellCollectionResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(wellFeatureSchema),
  /** Wells matching the filters, across all pages. */
  totalCount: z.number().int(),
  nextCursor: nextCursorSchema,
});
export type WellCollectionResponse = z.infer<typeof wellCollectionResponseSchema>;

/** `GET /api/wells/cumulative`: one row per well with its cumulative produced volumes. */
export const wellCumulativeSchema = z.object({
  wellId: z.number().int(),
  name: z.string(),
  lonDeg: z.number(),
  latDeg: z.number(),
  oilSm3: z.number().nullable(),
  gasSm3: z.number().nullable(),
  waterSm3: z.number().nullable(),
});
export type WellCumulative = z.infer<typeof wellCumulativeSchema>;

export const wellCumulativeResponseSchema = z.object({
  items: z.array(wellCumulativeSchema),
});
export type WellCumulativeResponse = z.infer<typeof wellCumulativeResponseSchema>;

/** `GET /api/wells/:id` */
export const wellDetailSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  wellType: wellTypeSchema.nullable(),
  status: wellStatusSchema,
  spudDate: isoDateSchema.nullable(),
  totalDepthM: z.number().nullable(),
  location: z.object({ lonDeg: z.number(), latDeg: z.number() }),
  field: z
    .object({
      id: z.number().int(),
      slug: z.string(),
      name: z.string(),
      operator: z.string().nullable(),
    })
    .nullable(),
  /** Which series exist for this well, so the interface can disable what is missing. */
  series: z.object({
    daily: z.object({ from: isoDateSchema, to: isoDateSchema, days: z.number().int() }).nullable(),
    hasTrajectory: z.boolean(),
    logCurves: z.array(z.string()),
  }),
  source: sourceRefSchema,
});
export type WellDetail = z.infer<typeof wellDetailSchema>;

// --- Production and trajectory series ---

const productionUnitsSchema = z.object({
  oil: z.literal('Sm3'),
  gas: z.literal('Sm3'),
  water: z.literal('Sm3'),
  waterInj: z.literal('Sm3'),
  bhp: z.literal('bar'),
  whp: z.literal('bar'),
  bht: z.literal('degC'),
  wht: z.literal('degC'),
  choke: z.literal('%'),
  onStream: z.literal('h'),
});

/** `GET /api/wells/:id/production` */
export const wellProductionResponseSchema = z.object({
  wellId: z.number().int(),
  interval: z.enum(['day', 'month']),
  units: productionUnitsSchema,
  dates: z.array(isoDateSchema),
  series: z.object({
    oil: z.array(z.number().nullable()),
    gas: z.array(z.number().nullable()),
    water: z.array(z.number().nullable()),
    waterInj: z.array(z.number().nullable()),
    bhp: z.array(z.number().nullable()),
    whp: z.array(z.number().nullable()),
    bht: z.array(z.number().nullable()),
    wht: z.array(z.number().nullable()),
    choke: z.array(z.number().nullable()),
    onStream: z.array(z.number().nullable()),
  }),
  source: sourceRefSchema,
});
export type WellProductionResponse = z.infer<typeof wellProductionResponseSchema>;

export const trajectoryStationSchema = z.object({
  mdM: z.number(),
  tvdM: z.number(),
  inclDeg: z.number().nullable(),
  azimDeg: z.number().nullable(),
});
export type TrajectoryStation = z.infer<typeof trajectoryStationSchema>;

/** `GET /api/wells/:id/trajectory` */
export const wellTrajectoryResponseSchema = z.object({
  wellId: z.number().int(),
  stations: z.array(trajectoryStationSchema),
  source: sourceRefSchema,
});
export type WellTrajectoryResponse = z.infer<typeof wellTrajectoryResponseSchema>;

const fieldProductionUnitsSchema = z.object({
  oil: z.literal('Sm3'),
  gas: z.literal('Sm3'),
  water: z.literal('Sm3'),
});

/** `GET /api/fields/:id/production` */
export const fieldProductionResponseSchema = z.object({
  fieldId: z.number().int(),
  interval: z.literal('month'),
  units: fieldProductionUnitsSchema,
  dates: z.array(isoDateSchema),
  series: z.object({
    oil: z.array(z.number().nullable()),
    gas: z.array(z.number().nullable()),
    water: z.array(z.number().nullable()),
  }),
  source: sourceRefSchema,
});
export type FieldProductionResponse = z.infer<typeof fieldProductionResponseSchema>;

// --- Sources ---

/** `GET /api/meta/sources` */
export const sourceListResponseSchema = z.object({
  items: z.array(
    sourceRefSchema.extend({
      id: z.number().int(),
      /** ISO 8601 timestamp of the last successful ingest; null if never ingested. */
      ingestedAt: z.iso.datetime().nullable(),
    }),
  ),
});
export type SourceListResponse = z.infer<typeof sourceListResponseSchema>;
