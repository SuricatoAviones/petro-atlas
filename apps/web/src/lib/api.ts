/** Browser calls to the read-only API. Every response is validated with a shared Zod schema. */
import {
  fieldListResponseSchema,
  sourceListResponseSchema,
  wellCollectionResponseSchema,
  wellCumulativeResponseSchema,
  wellDetailSchema,
  wellProductionResponseSchema,
  wellTrajectoryResponseSchema,
  type FieldSummary,
  type SourceListResponse,
  type WellCumulative,
  type WellDetail,
  type WellProductionResponse,
  type WellTrajectoryResponse,
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

/** Cumulative volumes per well for the bubble map (docs/06). */
export async function fetchCumulativeWells(
  query: string,
  signal?: AbortSignal,
): Promise<WellCumulative[]> {
  const suffix = query === '' ? '' : `?${query}`;
  return wellCumulativeResponseSchema.parse(await getJson(`/api/wells/cumulative${suffix}`, signal))
    .items;
}

/** Metadata of one well and the series it has (docs/06, `GET /api/wells/:id`). */
export async function fetchWellDetail(
  reference: number | string,
  signal?: AbortSignal,
): Promise<WellDetail> {
  const path = typeof reference === 'number' ? String(reference) : encodeURIComponent(reference);
  return wellDetailSchema.parse(await getJson(`/api/wells/${path}`, signal));
}

/** Daily production and operation series of one well (docs/06). */
export async function fetchWellProduction(
  reference: number | string,
  signal?: AbortSignal,
): Promise<WellProductionResponse> {
  const path = typeof reference === 'number' ? String(reference) : encodeURIComponent(reference);
  return wellProductionResponseSchema.parse(
    await getJson(`/api/wells/${path}/production?interval=day`, signal),
  );
}

/** Survey stations of one well (docs/06, `GET /api/wells/:id/trajectory`). */
export async function fetchWellTrajectory(
  reference: number | string,
  signal?: AbortSignal,
): Promise<WellTrajectoryResponse> {
  const path = typeof reference === 'number' ? String(reference) : encodeURIComponent(reference);
  return wellTrajectoryResponseSchema.parse(await getJson(`/api/wells/${path}/trajectory`, signal));
}

/** Data sources and their licences (docs/06, `GET /api/meta/sources`). */
export async function fetchSources(signal?: AbortSignal): Promise<SourceListResponse['items']> {
  return sourceListResponseSchema.parse(await getJson('/api/meta/sources', signal)).items;
}
