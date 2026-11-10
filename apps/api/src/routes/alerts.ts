import {
  alertLevelSchema,
  alertListResponseSchema,
  type AlertListResponse,
} from '@petroatlas/shared-types';
import { Router } from 'express';
import { z } from 'zod';

import type { Database } from '../database.ts';
import { idOrSlugParam, parseParams, setReadCacheHeader } from '../params.ts';

const alertsQuerySchema = z.object({
  field: idOrSlugParam.optional(),
  level: alertLevelSchema.optional(),
});

interface AlertRow {
  well_id: number;
  well_slug: string;
  well_name: string;
  level: 'warning' | 'critical';
  kinds: string[];
  as_of: string;
  oil_7d: number | null;
  oil_prev30: number | null;
  water_cut_7d: number | null;
  prod_3d: number | null;
}

/** `GET /alerts`: public wells with an active alert, critical first (docs/06, docs/09). */
export function createAlertsRouter(database: Database): Router {
  const router = Router();

  router.get('/alerts', async (request, response) => {
    const query = parseParams(alertsQuerySchema, request.query);

    const { rows } = await database.query<AlertRow>(
      `WITH last AS (
         SELECT well_id, max(date)::text AS as_of
         FROM production_daily
         GROUP BY well_id
       ),
       base AS (
         SELECT a.well_id, w.slug AS well_slug, w.name AS well_name, l.as_of,
                a.oil_7d, a.oil_prev30, a.water_cut_7d, a.prod_3d,
                a.production_drop, a.high_water_cut,
                a.no_production AND w.well_type = 'producer' AND w.status <> 'abandoned'
                  AS no_production_active
         FROM well_alert a
         JOIN well w ON w.id = a.well_id
         JOIN last l ON l.well_id = a.well_id
         LEFT JOIN field f ON f.id = w.field_id
         WHERE (f.slug = $1 OR f.id::text = $1 OR $1::text IS NULL)
           AND (a.production_drop IS NOT NULL OR a.high_water_cut OR a.no_production)
       ),
       alerts AS (
         SELECT *,
           CASE
             WHEN production_drop = 'critical' OR no_production_active THEN 'critical'
             WHEN production_drop = 'warning' OR high_water_cut THEN 'warning'
           END AS level,
           array_remove(ARRAY[
             CASE WHEN production_drop IS NOT NULL THEN 'production_drop' END,
             CASE WHEN high_water_cut THEN 'high_water_cut' END,
             CASE WHEN no_production_active THEN 'no_production' END
           ], NULL) AS kinds
         FROM base
       )
       SELECT well_id, well_slug, well_name, level, kinds, as_of,
              oil_7d, oil_prev30, water_cut_7d, prod_3d
       FROM alerts
       WHERE level IS NOT NULL AND ($2::text IS NULL OR level = $2)
       ORDER BY CASE level WHEN 'critical' THEN 0 ELSE 1 END, as_of DESC, well_name`,
      [query.field ?? null, query.level ?? null],
    );

    const body: AlertListResponse = alertListResponseSchema.parse({
      asOfByWell: true,
      items: rows.map((row) => ({
        wellId: row.well_id,
        wellSlug: row.well_slug,
        wellName: row.well_name,
        level: row.level,
        kinds: row.kinds,
        asOf: row.as_of,
        detail: {
          oil7d: row.oil_7d,
          oilPrev30: row.oil_prev30,
          waterCut7d: row.water_cut_7d,
          prod3d: row.prod_3d,
        },
      })),
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  return router;
}
