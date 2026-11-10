/** Browser calls to the read-only API. Every response is validated with a shared Zod schema. */
import {
  fieldListResponseSchema,
  wellCollectionResponseSchema,
  wellDetailSchema,
  type FieldSummary,
  type WellDetail,
} from '@petroatlas/shared-types';

import { mapConfig } from '@/components/map-config';

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${mapConfig.apiUrl}${path}`, { signal });
  if (!response.ok) throw new Error(`La API respondió ${String(response.status)}`);
  const body: unknown = await response.json();
  return body;
}

/** Fields for the filter panel, following the cursor until the last page. */
export async function fetchFields(signal?: AbortSignal): Promise<FieldSummary[]> {
  const fields: FieldSummary[] = [];
  let cursor: string | null = null;
  do {
    const suffix = cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`;
    const body = fieldListResponseSchema.parse(
      await getJson(`/api/fields?limit=1000${suffix}`, signal),
    );
    fields.push(...body.items);
    cursor = body.nextCursor;
  } while (cursor !== null);
  return fields;
}

/** Wells matching the filters, across every page, as the result count of the panel. */
export async function fetchWellCount(query: string, signal?: AbortSignal): Promise<number> {
  const suffix = query === '' ? '' : `&${query}`;
  const body = await getJson(`/api/wells?limit=1${suffix}`, signal);
  return wellCollectionResponseSchema.parse(body).totalCount;
}

/** Metadata of one well and the series it has (docs/06, `GET /api/wells/:id`). */
export async function fetchWellDetail(
  reference: number | string,
  signal?: AbortSignal,
): Promise<WellDetail> {
  const path = typeof reference === 'number' ? String(reference) : encodeURIComponent(reference);
  return wellDetailSchema.parse(await getJson(`/api/wells/${path}`, signal));
}
