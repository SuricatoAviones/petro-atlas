'use client';

import type { SourceRef } from '@petroatlas/shared-types';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { fetchFieldWellsWithProduction } from '@/lib/api';
import type { ImportedWell } from '@/lib/imported-wells';
import { MAX_COMPARED_WELLS, type UnitSystem } from '@/lib/sheet-state';
import {
  repositoryOf,
  wellKeyId,
  type ProductionSeries,
  type WellKey,
} from '@/lib/well-repository';

import { CHART_COLORS } from './chart-colors';
import { useMessages } from './locale-provider';
import {
  SeriesChart,
  convertSeries,
  unitOf,
  type ChartSeries,
  type LineType,
} from './series-chart';

export type ComparisonFluid = 'oil' | 'gas' | 'water';

const FLUIDS: readonly ComparisonFluid[] = ['oil', 'gas', 'water'];
/** Colour follows the fluid; the line style tells the wells apart (docs/07, rule 11). */
const LINE_TYPES: readonly LineType[] = ['solid', 'dashed', 'dotted', [6, 2, 1, 2], [2, 2]];

interface Candidate {
  key: WellKey;
  name: string;
}

function candidateId(candidate: Candidate): string {
  return wellKeyId(candidate.key);
}

/** The chip only needs to hint at the style; the chart holds the exact dash pattern. */
function cssLineStyle(lineType: LineType | undefined): 'solid' | 'dashed' | 'dotted' {
  return lineType === 'dashed' || lineType === 'dotted' ? lineType : 'solid';
}

export interface WellComparisonProps {
  /** The open well, already loaded by the sheet. */
  current: { key: WellKey; name: string; data: ProductionSeries };
  /** Field of the open public well; null for an imported one. */
  fieldSlug: string | null;
  importedWells: readonly ImportedWell[];
  /** Other wells drawn with the open one; public ones also live in the URL. */
  compareKeys: readonly WellKey[];
  onCompareKeysChange: (keys: WellKey[]) => void;
  unitSystem: UnitSystem;
  groupId: string;
}

function seriesFrom(
  dates: readonly string[],
  data: ProductionSeries | undefined,
  fluid: ComparisonFluid,
): (number | null)[] {
  if (data === undefined) return dates.map(() => null);
  const byDate = new Map<string, number | null>();
  data.dates.forEach((date, index) => {
    byDate.set(date, data.series[fluid][index] ?? null);
  });
  return dates.map((date) => byDate.get(date) ?? null);
}

function uniqueSources(sources: readonly SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const id = `${source.name}|${source.license}|${source.url}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Other wells of the field on the same rate chart (RF-10; docs/07, rule 11). */
export function WellComparison({
  current,
  fieldSlug,
  importedWells,
  compareKeys,
  onCompareKeysChange,
  unitSystem,
  groupId,
}: WellComparisonProps) {
  const messages = useMessages();
  const selectId = useId();
  const [fluid, setFluid] = useState<ComparisonFluid>('oil');
  const [publicCandidates, setPublicCandidates] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'error';
    items: Candidate[];
  }>({ status: 'idle', items: [] });
  const [loaded, setLoaded] = useState<
    Record<string, { status: 'loading' | 'ready' | 'error'; data: ProductionSeries | null }>
  >({});

  const currentId = wellKeyId(current.key);
  const others = useMemo(
    () => compareKeys.filter((key) => wellKeyId(key) !== currentId),
    [compareKeys, currentId],
  );
  const candidateList: Candidate[] = useMemo(() => {
    const imported: Candidate[] = importedWells.map((well) => ({
      key: { origin: 'imported', slug: well.slug },
      name: well.name,
    }));
    const publicItems =
      current.key.origin === 'public' && fieldSlug !== null ? publicCandidates.items : [];
    return [...publicItems, ...imported].filter(
      (candidate) => candidateId(candidate) !== currentId,
    );
  }, [current.key.origin, currentId, fieldSlug, importedWells, publicCandidates.items]);

  useEffect(() => {
    if (current.key.origin !== 'public' || fieldSlug === null) return;
    const controller = new AbortController();
    fetchFieldWellsWithProduction(fieldSlug, controller.signal)
      .then((wells) => {
        if (controller.signal.aborted) return;
        setPublicCandidates({
          status: 'ready',
          items: wells.map((well) => ({
            key: { origin: 'public', slug: well.slug },
            name: well.name,
          })),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPublicCandidates((state) => ({ status: 'error', items: state.items }));
        }
      });
    return () => {
      controller.abort();
    };
  }, [current.key.origin, fieldSlug]);

  const loadedRef = useRef(loaded);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    const controller = new AbortController();
    const missing = others.filter((key) => loadedRef.current[wellKeyId(key)] === undefined);
    for (const key of missing) {
      const id = wellKeyId(key);
      setLoaded((state) => ({ ...state, [id]: { status: 'loading', data: null } }));
      repositoryOf(key.origin)
        .getProduction(key.slug, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setLoaded((state) => ({ ...state, [id]: { status: 'ready', data } }));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setLoaded((state) => ({ ...state, [id]: { status: 'error', data: null } }));
        });
    }
    return () => {
      controller.abort();
    };
  }, [others]);

  const wells = useMemo(
    () => [
      { key: current.key, name: current.name, data: current.data },
      ...others.map((key) => {
        const candidate = candidateList.find((item) => candidateId(item) === wellKeyId(key));
        return {
          key,
          name: candidate?.name ?? key.slug,
          data: loaded[wellKeyId(key)]?.data ?? undefined,
        };
      }),
    ],
    [candidateList, others, current.data, current.key, current.name, loaded],
  );

  const dates = useMemo(
    () =>
      [
        ...new Set(wells.flatMap((well) => (well.data === undefined ? [] : [...well.data.dates]))),
      ].sort(),
    [wells],
  );
  const closedDates = useMemo(
    () => [
      ...new Set(
        wells.flatMap((well) =>
          well.data === undefined
            ? []
            : well.data.dates.filter((_, index) => well.data?.series.onStream[index] === 0),
        ),
      ),
    ],
    [wells],
  );

  const chartSeries: ChartSeries[] = wells.map((well, index) => ({
    name: well.name,
    color: CHART_COLORS[fluid],
    values: convertSeries(seriesFrom(dates, well.data, fluid), fluidVolume(fluid), unitSystem),
    lineType: LINE_TYPES[index % LINE_TYPES.length] ?? 'solid',
  }));
  const sources = uniqueSources(
    wells.flatMap((well) => (well.data === undefined ? [] : [well.data.source])),
  );
  const available = candidateList.filter(
    (candidate) => !others.some((key) => wellKeyId(key) === candidateId(candidate)),
  );
  const atLimit = others.length >= MAX_COMPARED_WELLS;

  return (
    <section className="comparison">
      <div className="chart-card__header">
        <h4>{messages.wellSheet.comparison.title}</h4>
      </div>
      <p className="chart-card__note">{messages.wellSheet.comparison.intro}</p>

      <fieldset className="filter-group comparison__fluid">
        <legend>{messages.wellSheet.comparison.fluid}</legend>
        {FLUIDS.map((candidate) => (
          <label key={candidate} className="filter-group__option">
            <input
              type="radio"
              name="comparison-fluid"
              checked={fluid === candidate}
              onChange={() => {
                setFluid(candidate);
              }}
            />
            {messages.wellSheet.production[candidate]}
          </label>
        ))}
      </fieldset>

      {current.key.origin === 'public' &&
        fieldSlug !== null &&
        (publicCandidates.status === 'loading' || publicCandidates.status === 'idle') && (
          <p className="chart-card__note" role="status">
            {messages.wellSheet.comparison.loading}
          </p>
        )}
      {publicCandidates.status === 'error' && (
        <p className="chart-card__note chart-card__note--error" role="alert">
          {messages.wellSheet.comparison.error}
        </p>
      )}

      <div className="comparison__add">
        <label htmlFor={selectId}>{messages.wellSheet.comparison.selectLabel}</label>
        <select
          id={selectId}
          value=""
          disabled={atLimit || available.length === 0}
          onChange={(event) => {
            const candidate = available.find(
              (item) => candidateId(item) === event.currentTarget.value,
            );
            if (candidate === undefined) return;
            onCompareKeysChange([...others, candidate.key]);
          }}
        >
          <option value="">
            {available.length === 0
              ? messages.wellSheet.comparison.noCandidates
              : messages.wellSheet.comparison.add}
          </option>
          {available.map((candidate) => (
            <option key={candidateId(candidate)} value={candidateId(candidate)}>
              {candidate.name}
            </option>
          ))}
        </select>
        {atLimit && (
          <p className="chart-card__note" role="status">
            {messages.wellSheet.comparison.maxReached(MAX_COMPARED_WELLS)}
          </p>
        )}
      </div>

      {others.length > 0 && (
        <>
          <ul className="comparison__chips" aria-label={messages.wellSheet.comparison.title}>
            {wells.map((well, index) => (
              <li key={wellKeyId(well.key)}>
                <span
                  className="comparison__style"
                  style={{
                    borderTopStyle: cssLineStyle(LINE_TYPES[index % LINE_TYPES.length]),
                    borderTopColor: CHART_COLORS[fluid],
                  }}
                  aria-hidden="true"
                />
                {well.name}
                {index > 0 && (
                  <button
                    type="button"
                    className="comparison__remove"
                    aria-label={`${messages.wellSheet.comparison.remove}: ${well.name}`}
                    onClick={() => {
                      onCompareKeysChange(
                        compareKeys.filter((key) => wellKeyId(key) !== wellKeyId(well.key)),
                      );
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          <SeriesChart
            title={messages.wellSheet.comparison.chartTitle}
            dates={dates}
            series={chartSeries}
            axes={[{ name: unitOf(fluidVolume(fluid), unitSystem) }]}
            source={sources}
            closedDates={closedDates}
            groupId={groupId}
          />
        </>
      )}
    </section>
  );
}

function fluidVolume(fluid: ComparisonFluid): 'liquidVolume' | 'gasVolume' {
  return fluid === 'gas' ? 'gasVolume' : 'liquidVolume';
}
