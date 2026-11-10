'use client';

import type { AlertItem, FieldSummary, WellCumulative } from '@petroatlas/shared-types';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchAlerts, fetchCumulativeWells, fetchFields, fetchWellCount } from '@/lib/api';
import { bubbleMaximum, type BubbleFluid } from '@/lib/bubble';
import { listImportedWells, type ImportedWell } from '@/lib/imported-wells';
import type { FitWindow, SheetTab, UnitSystem } from '@/lib/sheet-state';
import { parseMapUrlState, writeMapUrlState, type MapView } from '@/lib/url-state';
import { importedWellAlert, publicWellAlert, sortAlerts, type WellAlert } from '@/lib/well-alerts';
import { toWellQuery, type WellFilters } from '@/lib/well-filters';
import type { WellKey } from '@/lib/well-repository';

import {
  FilterPanel,
  type BubbleStatus,
  type FilterOptionsStatus,
  type WellCountState,
} from './filter-panel';
import { ImportPanel } from './import-panel';
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

function useAlerts(): { status: 'loading' | 'ready' | 'error'; items: readonly AlertItem[] } {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; items: AlertItem[] }>(
    {
      status: 'loading',
      items: [],
    },
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAlerts(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setState({ status: 'ready', items });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', items: [] });
      });
    return () => {
      controller.abort();
    };
  }, []);

  return state;
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
  const [fitWindow, setFitWindow] = useState<FitWindow | null>(initialUrlState.fitWindow);
  const [bubbleFluid, setBubbleFluid] = useState<BubbleFluid | null>(null);
  const [wellsAtPoint, setWellsAtPoint] = useState<readonly WellAtPoint[]>([]);
  const [selectedWell, setSelectedWell] = useState<WellSelection | null>(
    initialUrlState.wellSlug === null
      ? null
      : { id: null, slug: initialUrlState.wellSlug, name: null, origin: 'public' },
  );
  const [importedWells, setImportedWells] = useState<ImportedWell[]>([]);
  const [compareKeys, setCompareKeys] = useState<WellKey[]>(
    initialUrlState.compareSlugs.map((slug) => ({ origin: 'public', slug })),
  );
  const filterQuery = useMemo(() => toWellQuery(filters), [filters]);
  const options = useFieldOptions();
  const count = useWellCount(filterQuery);
  const alerts = useAlerts();
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
  const selectedWellSlug = selectedWell?.origin === 'public' ? selectedWell.slug : null;
  const compareSlugs = useMemo(
    () => compareKeys.filter((key) => key.origin === 'public').map((key) => key.slug),
    [compareKeys],
  );

  const keepImported = useCallback((wells: ImportedWell[]): void => {
    setImportedWells(wells);
    setCompareKeys((keys) =>
      keys.filter((key) => key.origin === 'public' || wells.some((well) => well.slug === key.slug)),
    );
    setSelectedWell((current) =>
      current?.origin === 'imported' && !wells.some((well) => well.slug === current.slug)
        ? null
        : current,
    );
  }, []);

  const refreshImportedWells = useCallback(async (): Promise<void> => {
    try {
      keepImported(await listImportedWells());
    } catch {
      keepImported([]);
    }
  }, [keepImported]);

  useEffect(() => {
    let cancelled = false;
    listImportedWells()
      .then((wells) => {
        if (!cancelled) keepImported(wells);
      })
      .catch(() => {
        if (!cancelled) keepImported([]);
      });
    return () => {
      cancelled = true;
    };
  }, [keepImported]);

  const allAlerts = useMemo(() => {
    const imported = importedWells.flatMap((well) => {
      const alert = importedWellAlert(well);
      return alert === null ? [] : [alert];
    });
    return sortAlerts([...alerts.items.map(publicWellAlert), ...imported]);
  }, [alerts.items, importedWells]);

  useEffect(() => {
    writeMapUrlState({
      filters,
      wellSlug: selectedWellSlug,
      view,
      tab: sheetTab,
      unitSystem,
      fitWindow,
      compareSlugs,
    });
  }, [compareSlugs, filters, fitWindow, selectedWellSlug, sheetTab, unitSystem, view]);

  const handleSelectWells = useCallback((wells: readonly WellAtPoint[]) => {
    const first = wells[0];
    setWellsAtPoint(wells);
    setSelectedWell(
      first === undefined
        ? null
        : { id: first.id, slug: first.slug, name: first.name, origin: first.origin },
    );
  }, []);
  const handleSelectWell = useCallback((well: WellAtPoint) => {
    setSelectedWell({ id: well.id, slug: well.slug, name: well.name, origin: well.origin });
  }, []);
  const closeWellSheet = useCallback(() => {
    setWellsAtPoint([]);
    setSelectedWell(null);
  }, []);
  const handleViewChange = useCallback((nextView: MapView) => {
    setView(nextView);
  }, []);
  const handleOpenAlert = useCallback((alert: WellAlert) => {
    setWellsAtPoint([]);
    setSelectedWell({
      id: alert.wellId,
      slug: alert.wellSlug,
      name: alert.wellName,
      origin: alert.origin,
    });
  }, []);
  const handleOpenImported = useCallback((well: ImportedWell) => {
    setWellsAtPoint([]);
    setSelectedWell({ id: null, slug: well.slug, name: well.name, origin: 'imported' });
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
        alerts={allAlerts}
        alertsStatus={alerts.status}
        onFiltersChange={setFilters}
        onColorModeChange={setColorMode}
        onBubbleFluidChange={setBubbleFluid}
        onOpenWell={handleOpenAlert}
      >
        <ImportPanel
          importedWells={importedWells}
          onImportedChange={refreshImportedWells}
          onOpenImported={handleOpenImported}
        />
      </FilterPanel>
      <div className="map-explorer__map">
        <LazyWellMap
          colorMode={colorMode}
          filtersQuery={filterQuery}
          initialView={initialUrlState.view}
          bubbles={bubbleLayer}
          importedWells={importedWells}
          onSelectWells={handleSelectWells}
          onViewChange={handleViewChange}
        />
        {selectedWell !== null && (
          <WellSheet
            wells={wellsAtPoint}
            selectedWell={selectedWell}
            tab={sheetTab}
            unitSystem={unitSystem}
            fitWindow={fitWindow}
            alerts={allAlerts}
            importedWells={importedWells}
            compareKeys={compareKeys}
            onCompareKeysChange={setCompareKeys}
            onSelectWell={handleSelectWell}
            onTabChange={setSheetTab}
            onUnitSystemChange={setUnitSystem}
            onFitWindowChange={setFitWindow}
            onClose={closeWellSheet}
          />
        )}
      </div>
    </div>
  );
}
