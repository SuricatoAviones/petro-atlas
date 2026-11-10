/** Lookup of a well or field by numeric id or slug, shared by the series routes (docs/06). */
import type { SourceRef } from '@petroatlas/shared-types';

import type { Database } from './database.ts';
import { splitIdOrSlug } from './params.ts';

export interface WellReference {
  id: number;
  name: string;
  source: SourceRef;
}

export interface FieldReference {
  id: number;
  name: string;
  source: SourceRef;
}

export async function findWell(
  database: Database,
  reference: string,
): Promise<WellReference | null> {
  const { id, slug } = splitIdOrSlug(reference);
  const { rows } = await database.query<{
    id: number;
    name: string;
    source_name: string;
    source_license: string;
    source_url: string;
  }>(
    `SELECT w.id, w.name,
            s.name AS source_name, s.license AS source_license, s.url AS source_url
     FROM well w
     JOIN data_source s ON s.id = w.source_id
     WHERE w.id = $1 OR w.slug = $2
     ORDER BY (w.slug = $2) DESC
     LIMIT 1`,
    [id, slug],
  );
  const row = rows[0];
  if (row === undefined) return null;
  return {
    id: row.id,
    name: row.name,
    source: { name: row.source_name, license: row.source_license, url: row.source_url },
  };
}

export async function findField(
  database: Database,
  reference: string,
): Promise<FieldReference | null> {
  const { id, slug } = splitIdOrSlug(reference);
  const { rows } = await database.query<{
    id: number;
    name: string;
    source_name: string;
    source_license: string;
    source_url: string;
  }>(
    `SELECT f.id, f.name,
            s.name AS source_name, s.license AS source_license, s.url AS source_url
     FROM field f
     JOIN data_source s ON s.id = f.source_id
     WHERE f.id = $1 OR f.slug = $2
     ORDER BY (f.slug = $2) DESC
     LIMIT 1`,
    [id, slug],
  );
  const row = rows[0];
  if (row === undefined) return null;
  return {
    id: row.id,
    name: row.name,
    source: { name: row.source_name, license: row.source_license, url: row.source_url },
  };
}
