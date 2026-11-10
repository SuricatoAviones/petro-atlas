import { sourceListResponseSchema, type SourceListResponse } from '@petroatlas/shared-types';
import { Router } from 'express';

import type { Database } from '../database.ts';
import { setReadCacheHeader } from '../params.ts';

interface SourceRow {
  id: number;
  name: string;
  license: string;
  url: string;
  ingested_at: Date | null;
}

/** `GET /meta/sources`: data sources, licences and last ingest (docs/06, RNF-02). */
export function createMetaRouter(database: Database): Router {
  const router = Router();

  router.get('/meta/sources', async (_request, response) => {
    const { rows } = await database.query<SourceRow>(
      'SELECT id, name, license, url, ingested_at FROM data_source ORDER BY name',
    );
    const body: SourceListResponse = sourceListResponseSchema.parse({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        license: row.license,
        url: row.url,
        ingestedAt: row.ingested_at?.toISOString() ?? null,
      })),
    });
    setReadCacheHeader(response);
    response.json(body);
  });

  return router;
}
