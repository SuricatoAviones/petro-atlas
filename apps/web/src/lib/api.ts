/** Browser calls to the read-only API. Every response is validated with a shared Zod schema. */
import {
  alertListResponseSchema,
  fieldListResponseSchema,
  sourceListResponseSchema,
  wellCollectionResponseSchema,
  wellCumulativeResponseSchema,
  wellDetailSchema,
  wellLogsResponseSchema,
  wellProductionResponseSchema,
  wellTrajectoryResponseSchema,
  type AlertItem,
  type FieldSummary,
  type SourceListResponse,
  type WellCumulative,
  type WellDetail,
  type WellLogsResponse,
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

/** Active alerts of the public wells (docs/06, `GET /api/alerts`). */
export async function fetchAlerts(signal?: AbortSignal): Promise<AlertItem[]> {
  return alertListResponseSchema.parse(await getJson('/api/alerts', signal)).items;
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

/** Log curves of one well (docs/06, `GET /api/wells/:id/logs`). */
export async function fetchWellLogs(
  reference: number | string,
  signal?: AbortSignal,
): Promise<WellLogsResponse> {
  const path = typeof reference === 'number' ? String(reference) : encodeURIComponent(reference);
  return wellLogsResponseSchema.parse(await getJson(`/api/wells/${path}/logs`, signal));
}

export interface FieldWell {
  slug: string;
  name: string;
}

/** Wells of a field that have daily production: the candidates to compare with (RF-10). */
export async function fetchFieldWellsWithProduction(
  fieldSlug: string,
  signal?: AbortSignal,
): Promise<FieldWell[]> {
  const wells: FieldWell[] = [];
  let cursor: string | null = null;
  do {
    const suffix = cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`;
    const body = wellCollectionResponseSchema.parse(
      await getJson(
        `/api/wells?field=${encodeURIComponent(fieldSlug)}&limit=1000${suffix}`,
        signal,
      ),
    );
    for (const feature of body.features) {
      if (feature.properties.hasDailyData) {
        wells.push({ slug: feature.properties.slug, name: feature.properties.name });
      }
    }
    cursor = body.nextCursor;
  } while (cursor !== null);
  return wells.sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

/** Address of the CSV with the whole daily series of a well (docs/06, `export.csv`). */
export function wellExportUrl(slug: string): string {
  return `${mapConfig.apiUrl}/api/wells/${encodeURIComponent(slug)}/export.csv`;
}

/** Data sources and their licences (docs/06, `GET /api/meta/sources`). */
export async function fetchSources(signal?: AbortSignal): Promise<SourceListResponse['items']> {
  return sourceListResponseSchema.parse(await getJson('/api/meta/sources', signal)).items;
}
