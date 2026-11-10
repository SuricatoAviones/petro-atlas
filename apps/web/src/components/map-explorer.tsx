'use client';

import type { FieldSummary } from '@petroatlas/shared-types';
import { useEffect, useMemo, useState } from 'react';

import { fetchFields, fetchWellCount } from '@/lib/api';
import { EMPTY_WELL_FILTERS, toWellQuery, type WellFilters } from '@/lib/well-filters';

import { FilterPanel, type FilterOptionsStatus, type WellCountState } from './filter-panel';
import { LazyWellMap } from './lazy-well-map';
import type { WellColorMode } from './well-colors';

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
  const [filters, setFilters] = useState<WellFilters>(EMPTY_WELL_FILTERS);
  const [colorMode, setColorMode] = useState<WellColorMode>('status');
  const filterQuery = useMemo(() => toWellQuery(filters), [filters]);
  const options = useFieldOptions();
  const count = useWellCount(filterQuery);

  return (
    <div className="map-explorer">
      <FilterPanel
        filters={filters}
        fields={options.fields}
        operators={options.operators}
        optionsStatus={options.status}
        count={count}
        colorMode={colorMode}
        onFiltersChange={setFilters}
        onColorModeChange={setColorMode}
      />
      <div className="map-explorer__map">
        <LazyWellMap colorMode={colorMode} filtersQuery={filterQuery} />
      </div>
    </div>
  );
}
