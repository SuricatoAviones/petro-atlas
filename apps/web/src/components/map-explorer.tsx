'use client';

import type { FieldSummary, WellCumulative } from '@petroatlas/shared-types';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchCumulativeWells, fetchFields, fetchWellCount } from '@/lib/api';
import { bubbleMaximum, type BubbleFluid } from '@/lib/bubble';
import type { SheetTab, UnitSystem } from '@/lib/sheet-state';
import { parseMapUrlState, writeMapUrlState, type MapView } from '@/lib/url-state';
import { toWellQuery, type WellFilters } from '@/lib/well-filters';

import {
  FilterPanel,
  type BubbleStatus,
  type FilterOptionsStatus,
  type WellCountState,
} from './filter-panel';
import { LazyWellMap } from './lazy-well-map';
import type { WellColorMode } from './well-colors';
import type { WellAtPoint } from './well-map';
import { WellSheet, type WellSelection } from './well-sheet';

interface FieldOptionsState {
  status: FilterOptionsStatus;
  items: FieldSummary[];
}

interface CountState {
  status: 'loading' | 'ready' | 'error';
  query: string;
  total: number | null;
}

function useFieldOptions(): {
  status: FilterOptionsStatus;
  fields: readonly FieldSummary[];
  operators: readonly string[];
} {
  const [state, setState] = useState<FieldOptionsState>({ status: 'loading', items: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetchFields(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setState({ status: 'ready', items });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState((current) => ({ status: 'error', items: current.items }));
        }
      });
    return () => {
      controller.abort();
    };
  }, []);

  const operators = useMemo(() => {
    const names = state.items
      .map((field) => field.operator)
      .filter((operator): operator is string => operator !== null);
    return [...new Set(names)].sort((left, right) => left.localeCompare(right, 'es'));
  }, [state.items]);

  return { status: state.status, fields: state.items, operators };
}

interface CumulativeState {
  key: string | null;
  status: BubbleStatus;
  items: WellCumulative[];
}

function useCumulativeWells(
  query: string,
  fluid: BubbleFluid | null,
): { status: BubbleStatus; items: readonly WellCumulative[] } {
  const key = fluid === null ? null : `${fluid}|${query}`;
  const [state, setState] = useState<CumulativeState>({
    key: null,
    status: 'idle',
    items: [],
  });

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    fetchCumulativeWells(query, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setState({ key, status: 'ready', items });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, status: 'error', items: [] });
      });
    return () => {
      controller.abort();
    };
  }, [key, query]);

  if (key === null) return { status: 'idle', items: [] };
  if (state.key !== key) return { status: 'loading', items: state.items };
  return { status: state.status, items: state.items };
}

function useWellCount(query: string): WellCountState {
  const [state, setState] = useState<CountState>({
    status: 'loading',
    query: '',
    total: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchWellCount(query, controller.signal)
      .then((total) => {
        if (!controller.signal.aborted) setState({ status: 'ready', query, total });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState((current) => ({ status: 'error', query, total: current.total }));
        }
      });
    return () => {
      controller.abort();
    };
  }, [query]);

  // A result from another filter set is stale: show the loading state while the new one arrives.
  if (state.query !== query) return { status: 'loading', total: state.total };
  return state;
}

/** Map page state: filters, result count and colour mode, shared by the panel and the map. */
export function MapExplorer() {
  const searchParams = useSearchParams();
  const [initialUrlState] = useState(() => parseMapUrlState(searchParams));
  const [filters, setFilters] = useState<WellFilters>(initialUrlState.filters);
  const [colorMode, setColorMode] = useState<WellColorMode>('status');
  const [view, setView] = useState<MapView>(initialUrlState.view);
  const [sheetTab, setSheetTab] = useState<SheetTab>(initialUrlState.tab);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialUrlState.unitSystem);
  const [bubbleFluid, setBubbleFluid] = useState<BubbleFluid | null>(null);
  const [wellsAtPoint, setWellsAtPoint] = useState<readonly WellAtPoint[]>([]);
  const [selectedWell, setSelectedWell] = useState<WellSelection | null>(
    initialUrlState.wellSlug === null
      ? null
      : { id: null, slug: initialUrlState.wellSlug, name: null },
  );
  const filterQuery = useMemo(() => toWellQuery(filters), [filters]);
  const options = useFieldOptions();
  const count = useWellCount(filterQuery);
  const cumulative = useCumulativeWells(filterQuery, bubbleFluid);
  const bubbleMax = useMemo(
    () => (bubbleFluid === null ? 0 : bubbleMaximum(cumulative.items, bubbleFluid)),
    [bubbleFluid, cumulative.items],
  );
  const bubbleLayer = useMemo(
    () =>
      bubbleFluid === null || cumulative.status !== 'ready'
        ? null
        : { fluid: bubbleFluid, items: cumulative.items },
    [bubbleFluid, cumulative.items, cumulative.status],
  );
  const selectedWellSlug = selectedWell?.slug ?? null;

  useEffect(() => {
    writeMapUrlState({
      filters,
      wellSlug: selectedWellSlug,
      view,
      tab: sheetTab,
      unitSystem,
    });
  }, [filters, selectedWellSlug, sheetTab, unitSystem, view]);

  const handleSelectWells = useCallback((wells: readonly WellAtPoint[]) => {
    const first = wells[0];
    setWellsAtPoint(wells);
    setSelectedWell(
      first === undefined ? null : { id: first.id, slug: first.slug, name: first.name },
    );
  }, []);
  const handleSelectWell = useCallback((well: WellAtPoint) => {
    setSelectedWell({ id: well.id, slug: well.slug, name: well.name });
  }, []);
  const closeWellSheet = useCallback(() => {
    setWellsAtPoint([]);
    setSelectedWell(null);
  }, []);
  const handleViewChange = useCallback((nextView: MapView) => {
    setView(nextView);
  }, []);

  return (
    <div className="map-explorer">
      <FilterPanel
        filters={filters}
        fields={options.fields}
        operators={options.operators}
        optionsStatus={options.status}
        count={count}
        colorMode={colorMode}
        bubbleFluid={bubbleFluid}
        bubbleMax={bubbleMax}
        bubbleStatus={cumulative.status}
        onFiltersChange={setFilters}
        onColorModeChange={setColorMode}
        onBubbleFluidChange={setBubbleFluid}
      />
      <div className="map-explorer__map">
        <LazyWellMap
          colorMode={colorMode}
          filtersQuery={filterQuery}
          initialView={initialUrlState.view}
          bubbles={bubbleLayer}
          onSelectWells={handleSelectWells}
          onViewChange={handleViewChange}
        />
        {selectedWell !== null && (
          <WellSheet
            wells={wellsAtPoint}
            selectedWell={selectedWell}
            tab={sheetTab}
            unitSystem={unitSystem}
            onSelectWell={handleSelectWell}
            onTabChange={setSheetTab}
            onUnitSystemChange={setUnitSystem}
            onClose={closeWellSheet}
          />
        )}
      </div>
    </div>
  );
}
