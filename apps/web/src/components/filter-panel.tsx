import {
  wellStatusSchema,
  wellTypeSchema,
  type FieldSummary,
  type WellStatus,
  type WellType,
} from '@petroatlas/shared-types';
import { useId, type ReactNode } from 'react';

import { BUBBLE_FLUIDS, bubbleRadius, formatVolume, type BubbleFluid } from '@/lib/bubble';
import { messages } from '@/messages/es';
import type { WellAlert } from '@/lib/well-alerts';
import { EMPTY_WELL_FILTERS, hasActiveWellFilters, type WellFilters } from '@/lib/well-filters';

import { AlertsList } from './alerts-list';
import {
  BUBBLE_COLORS,
  WELL_STATUS_COLORS,
  WELL_TYPE_COLORS,
  type WellColorMode,
} from './well-colors';
import { WellLegend } from './well-legend';

const WELL_STATUSES: readonly WellStatus[] = wellStatusSchema.options;
const WELL_TYPES: readonly WellType[] = wellTypeSchema.options;

export type FilterOptionsStatus = 'loading' | 'ready' | 'error';
export type BubbleStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WellCountState {
  status: FilterOptionsStatus;
  total: number | null;
}

interface FilterPanelProps {
  filters: WellFilters;
  fields: readonly FieldSummary[];
  operators: readonly string[];
  optionsStatus: FilterOptionsStatus;
  count: WellCountState;
  colorMode: WellColorMode;
  bubbleFluid: BubbleFluid | null;
  bubbleMax: number;
  bubbleStatus: BubbleStatus;
  alerts: readonly WellAlert[];
  alertsStatus: BubbleStatus;
  onFiltersChange: (filters: WellFilters) => void;
  onColorModeChange: (mode: WellColorMode) => void;
  onBubbleFluidChange: (fluid: BubbleFluid | null) => void;
  onOpenWell: (alert: WellAlert) => void;
  /** Sections below the alerts, such as the CSV import of docs/09. */
  children?: ReactNode;
}

function toggleItem<T>(items: readonly T[], item: T, selected: boolean): T[] {
  return selected ? [...items, item] : items.filter((current) => current !== item);
}

/** Filter form, result count and legend of the well map (docs/06, docs/09). */
export function FilterPanel({
  filters,
  fields,
  operators,
  optionsStatus,
  count,
  colorMode,
  bubbleFluid,
  bubbleMax,
  bubbleStatus,
  alerts,
  alertsStatus,
  onFiltersChange,
  onColorModeChange,
  onBubbleFluidChange,
  onOpenWell,
  children,
}: FilterPanelProps) {
  const fieldId = useId();
  const operatorId = useId();
  const spudFromId = useId();
  const spudToId = useId();

  const optionsDisabled = optionsStatus !== 'ready';
  const countText =
    count.status === 'loading'
      ? messages.filters.loading
      : count.status === 'error'
        ? messages.filters.countError
        : count.total === null
          ? messages.filters.loading
          : messages.filters.resultCount(count.total);

  return (
    <aside className="filter-panel" aria-label={messages.filters.label}>
      <div className="filter-panel__header">
        <h2>{messages.filters.title}</h2>
        <button
          type="button"
          className="filter-panel__reset"
          disabled={!hasActiveWellFilters(filters)}
          onClick={() => {
            onFiltersChange(EMPTY_WELL_FILTERS);
          }}
        >
          {messages.filters.reset}
        </button>
      </div>

      <p
        className={
          count.status === 'error'
            ? 'filter-panel__count filter-panel__count--error'
            : 'filter-panel__count'
        }
        role="status"
        aria-live="polite"
        data-testid="well-count"
      >
        {countText}
      </p>

      <form
        className="filter-panel__form"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="filter-panel__row">
          <label htmlFor={fieldId}>{messages.filters.field}</label>
          <select
            id={fieldId}
            value={filters.field}
            disabled={optionsDisabled}
            onChange={(event) => {
              onFiltersChange({ ...filters, field: event.currentTarget.value });
            }}
          >
            <option value="">{messages.filters.allFields}</option>
            {fields.map((field) => (
              <option key={field.id} value={field.slug}>
                {field.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-panel__row">
          <label htmlFor={operatorId}>{messages.filters.operator}</label>
          <select
            id={operatorId}
            value={filters.operator}
            disabled={optionsDisabled}
            onChange={(event) => {
              onFiltersChange({ ...filters, operator: event.currentTarget.value });
            }}
          >
            <option value="">{messages.filters.allOperators}</option>
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
        </div>

        {optionsStatus === 'loading' && (
          <p className="filter-panel__hint" role="status">
            {messages.filters.optionsLoading}
          </p>
        )}
        {optionsStatus === 'error' && (
          <p className="filter-panel__hint filter-panel__hint--error" role="alert">
            {messages.filters.optionsError}
          </p>
        )}

        <fieldset className="filter-group">
          <legend>{messages.filters.status}</legend>
          {WELL_STATUSES.map((status) => (
            <label key={status} className="filter-group__option">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status)}
                onChange={(event) => {
                  onFiltersChange({
                    ...filters,
                    statuses: toggleItem(filters.statuses, status, event.currentTarget.checked),
                  });
                }}
              />
              <span
                className="filter-group__swatch"
                style={{ backgroundColor: WELL_STATUS_COLORS[status] }}
                aria-hidden="true"
              />
              {messages.wellStatus[status]}
            </label>
          ))}
        </fieldset>

        <fieldset className="filter-group">
          <legend>{messages.filters.type}</legend>
          {WELL_TYPES.map((type) => (
            <label key={type} className="filter-group__option">
              <input
                type="checkbox"
                checked={filters.types.includes(type)}
                onChange={(event) => {
                  onFiltersChange({
                    ...filters,
                    types: toggleItem(filters.types, type, event.currentTarget.checked),
                  });
                }}
              />
              <span
                className="filter-group__swatch"
                style={{ backgroundColor: WELL_TYPE_COLORS[type] }}
                aria-hidden="true"
              />
              {messages.wellType[type]}
            </label>
          ))}
        </fieldset>

        <fieldset className="filter-group">
          <legend>{messages.map.bubbles.title}</legend>
          <label className="filter-group__option">
            <input
              type="radio"
              name="bubble-fluid"
              checked={bubbleFluid === null}
              onChange={() => {
                onBubbleFluidChange(null);
              }}
            />
            {messages.map.bubbles.none}
          </label>
          {BUBBLE_FLUIDS.map((fluid) => (
            <label key={fluid} className="filter-group__option">
              <input
                type="radio"
                name="bubble-fluid"
                checked={bubbleFluid === fluid}
                onChange={() => {
                  onBubbleFluidChange(fluid);
                }}
              />
              <span
                className="filter-group__swatch"
                style={{ backgroundColor: BUBBLE_COLORS[fluid] }}
                aria-hidden="true"
              />
              {messages.map.bubbles[fluid]}
            </label>
          ))}
          {bubbleFluid !== null && (
            <div className="bubble-legend" aria-live="polite">
              <p>{messages.map.bubbles.legend}</p>
              {bubbleStatus === 'loading' && (
                <p className="filter-panel__hint" role="status">
                  {messages.map.bubbles.loading}
                </p>
              )}
              {bubbleStatus === 'error' && (
                <p className="filter-panel__hint filter-panel__hint--error" role="alert">
                  {messages.map.bubbles.loadError}
                </p>
              )}
              {bubbleStatus === 'ready' && bubbleMax > 0 && (
                <ul>
                  {[0.25, 0.5, 1].map((fraction) => {
                    const value = bubbleMax * fraction;
                    const radius = bubbleRadius(value, bubbleMax);
                    return (
                      <li key={fraction}>
                        <span
                          className="bubble-legend__circle"
                          style={{
                            width: `${String(radius * 2)}px`,
                            height: `${String(radius * 2)}px`,
                          }}
                          aria-hidden="true"
                        />
                        {formatVolume(value)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="filter-panel__years">
          <legend>{messages.filters.spudRange}</legend>
          <div>
            <label htmlFor={spudFromId}>{messages.filters.spudFrom}</label>
            <input
              id={spudFromId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder={messages.filters.yearPlaceholder}
              value={filters.spudFromYear}
              onChange={(event) => {
                onFiltersChange({
                  ...filters,
                  spudFromYear: event.currentTarget.value.replace(/\D/g, '').slice(0, 4),
                });
              }}
            />
          </div>
          <div>
            <label htmlFor={spudToId}>{messages.filters.spudTo}</label>
            <input
              id={spudToId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder={messages.filters.yearPlaceholder}
              value={filters.spudToYear}
              onChange={(event) => {
                onFiltersChange({
                  ...filters,
                  spudToYear: event.currentTarget.value.replace(/\D/g, '').slice(0, 4),
                });
              }}
            />
          </div>
        </fieldset>
      </form>

      <WellLegend colorMode={colorMode} onColorModeChange={onColorModeChange} />

      <section className="filter-panel__alerts" aria-labelledby="alerts-heading">
        <h3 id="alerts-heading">
          {messages.alerts.title} ({alerts.length})
        </h3>
        {alertsStatus === 'loading' && (
          <p className="filter-panel__hint" role="status">
            {messages.alerts.loading}
          </p>
        )}
        {alertsStatus === 'error' && (
          <p className="filter-panel__hint filter-panel__hint--error" role="alert">
            {messages.alerts.loadError}
          </p>
        )}
        {alertsStatus === 'ready' && <AlertsList alerts={alerts} onOpenWell={onOpenWell} />}
      </section>
      {children}
    </aside>
  );
}
