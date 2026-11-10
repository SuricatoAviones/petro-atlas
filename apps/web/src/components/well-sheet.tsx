'use client';

import type {
  WellDetail,
  WellLogsResponse,
  WellProductionResponse,
  WellTrajectoryResponse,
} from '@petroatlas/shared-types';
import { useEffect, useId, useRef, useState } from 'react';

import { wellExportUrl } from '@/lib/api';
import { downloadCsv, safeFileName, type TableData } from '@/lib/export';
import type { ImportedWell } from '@/lib/imported-wells';
import type { FitWindow, SheetTab, UnitSystem } from '@/lib/sheet-state';
import type { WellAlert } from '@/lib/well-alerts';
import {
  repositoryOf,
  wellKeyId,
  type ProductionSeries,
  type WellKey,
  type WellOrigin,
} from '@/lib/well-repository';

import { AlertsList } from './alerts-list';
import { LazyDiagnosticsTab } from './lazy-diagnostics-tab';
import { LazyEngineeringTab } from './lazy-engineering-tab';
import { LazyProductionCharts } from './lazy-production-charts';
import { LazyTrajectoryChart } from './lazy-trajectory-chart';
import { useLocale, useMessages } from './locale-provider';
import { LogsChart } from './logs-chart';
import { WellComparison } from './well-comparison';
import type { WellAtPoint } from './well-map';

export interface WellSelection {
  /** Known when the well comes from a map click; null when the URL only carries the slug. */
  id: number | null;
  slug: string;
  name: string | null;
  origin: WellOrigin;
}

interface WellSheetProps {
  /** Wells drawn under the click; the API can place several at the same coordinates. */
  wells: readonly WellAtPoint[];
  selectedWell: WellSelection;
  tab: SheetTab;
  unitSystem: UnitSystem;
  fitWindow: FitWindow | null;
  alerts: readonly WellAlert[];
  importedWells: readonly ImportedWell[];
  compareKeys: readonly WellKey[];
  onCompareKeysChange: (keys: WellKey[]) => void;
  onSelectWell: (well: WellAtPoint) => void;
  onTabChange: (tab: SheetTab) => void;
  onUnitSystemChange: (unitSystem: UnitSystem) => void;
  onFitWindowChange: (fitWindow: FitWindow | null) => void;
  onClose: () => void;
}

interface LoadState<T> {
  status: 'idle' | 'loading' | 'ready' | 'error';
  key: string | null;
  data: T | null;
}

function idleState<T>(): LoadState<T> {
  return { status: 'idle', key: null, data: null };
}

const TABS: readonly SheetTab[] = [
  'summary',
  'production',
  'operation',
  'trajectory',
  'logs',
  'engineering',
  'diagnostics',
];

function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function formatDepth(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function formatCoordinate(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 5,
  }).format(value);
}

function openStreetMapUrl(latDeg: number, lonDeg: number): string {
  return `https://www.openstreetmap.org/?mlat=${String(latDeg)}&mlon=${String(lonDeg)}#map=13/${String(latDeg)}/${String(lonDeg)}`;
}

/** The exported columns follow the import format of docs/09, so the file can be re-imported. */
function productionTable(detail: WellDetail, data: ProductionSeries): TableData {
  return {
    headers: [
      'well',
      'date',
      'lat',
      'lon',
      'oil_sm3',
      'gas_sm3',
      'water_sm3',
      'on_stream_h',
      'bhp_bar',
      'whp_bar',
      'choke_pct',
    ],
    rows: data.dates.map((date, index) => [
      detail.name,
      date,
      detail.location.latDeg,
      detail.location.lonDeg,
      data.series.oil[index] ?? null,
      data.series.gas[index] ?? null,
      data.series.water[index] ?? null,
      data.series.onStream[index] ?? null,
      data.series.bhp[index] ?? null,
      data.series.whp[index] ?? null,
      data.series.choke[index] ?? null,
    ]),
  };
}

/** Metadata, series, logs and engineering tools of a well (docs/07, docs/09). */
export function WellSheet({
  wells,
  selectedWell,
  tab,
  unitSystem,
  fitWindow,
  alerts,
  importedWells,
  compareKeys,
  onCompareKeysChange,
  onSelectWell,
  onTabChange,
  onUnitSystemChange,
  onFitWindowChange,
  onClose,
}: WellSheetProps) {
  const messages = useMessages();
  const headingId = useId();
  const chartGroupId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<LoadState<WellDetail>>(idleState);
  const [production, setProduction] = useState<LoadState<WellProductionResponse>>(idleState);
  const [trajectory, setTrajectory] = useState<LoadState<WellTrajectoryResponse>>(idleState);
  const [logs, setLogs] = useState<LoadState<WellLogsResponse>>(idleState);
  const selectedSlug = selectedWell.slug;
  const selectedOrigin = selectedWell.origin;
  const selectedKey = wellKeyId({ origin: selectedOrigin, slug: selectedSlug });
  const repository = repositoryOf(selectedOrigin);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    repository
      .getDetail(selectedSlug, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) {
          setState({ status: 'ready', key: selectedKey, data: detail });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error', key: selectedKey, data: null });
      });
    return () => {
      controller.abort();
    };
  }, [repository, selectedKey, selectedSlug]);

  useEffect(() => {
    const controller = new AbortController();
    repository
      .getProduction(selectedSlug, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setProduction({ status: 'ready', key: selectedKey, data });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProduction({ status: 'error', key: selectedKey, data: null });
        }
      });
    return () => {
      controller.abort();
    };
  }, [repository, selectedKey, selectedSlug]);

  useEffect(() => {
    const controller = new AbortController();
    repository
      .getTrajectory(selectedSlug, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setTrajectory({ status: 'ready', key: selectedKey, data });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTrajectory({ status: 'error', key: selectedKey, data: null });
        }
      });
    return () => {
      controller.abort();
    };
  }, [repository, selectedKey, selectedSlug]);

  useEffect(() => {
    if (tab !== 'logs' || selectedOrigin !== 'public') return;
    const controller = new AbortController();
    repository
      .getLogs(selectedSlug, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setLogs({ status: 'ready', key: selectedKey, data });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLogs({ status: 'error', key: selectedKey, data: null });
        }
      });
    return () => {
      controller.abort();
    };
  }, [repository, selectedKey, selectedOrigin, selectedSlug, tab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isCurrent = state.key === selectedKey;
  const detail = isCurrent && state.status === 'ready' ? state.data : null;
  const isLoading = !isCurrent || state.status === 'idle' || state.status === 'loading';
  const isProductionCurrent = production.key === selectedKey;
  const productionData =
    isProductionCurrent && production.status === 'ready' ? production.data : null;
  const isProductionLoading =
    !isProductionCurrent || production.status === 'idle' || production.status === 'loading';
  const isProductionError = isProductionCurrent && production.status === 'error';
  const isTrajectoryCurrent = trajectory.key === selectedKey;
  const trajectoryData =
    isTrajectoryCurrent && trajectory.status === 'ready' ? trajectory.data : null;
  const isTrajectoryLoading =
    !isTrajectoryCurrent || trajectory.status === 'idle' || trajectory.status === 'loading';
  const isTrajectoryError = isTrajectoryCurrent && trajectory.status === 'error';
  const isLogsCurrent = logs.key === selectedKey;
  const logsData = isLogsCurrent && logs.status === 'ready' ? logs.data : null;
  const isLogsLoading = !isLogsCurrent || logs.status === 'idle' || logs.status === 'loading';
  const isLogsError = isLogsCurrent && logs.status === 'error';
  const wellAlerts =
    selectedOrigin === 'public'
      ? alerts.filter(
          (alert) => alert.origin === 'public' && detail !== null && alert.wellId === detail.id,
        )
      : alerts.filter((alert) => alert.origin === 'imported' && alert.wellSlug === selectedSlug);
  const currentKey: WellKey = { origin: selectedOrigin, slug: selectedSlug };

  return (
    <aside className="well-sheet" aria-labelledby={headingId} data-testid="well-sheet">
      <div className="well-sheet__header">
        <div>
          <h2 id={headingId}>{detail?.name ?? selectedWell.name ?? messages.wellSheet.title}</h2>
          {detail !== null && <p className="well-sheet__subtitle">{detail.slug}</p>}
        </div>
        <button
          ref={closeRef}
          type="button"
          className="well-sheet__close"
          aria-label={messages.wellSheet.close}
          onClick={onClose}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </div>

      {wells.length > 1 && (
        <nav aria-label={messages.wellSheet.wellsAtPoint}>
          <ul className="well-sheet__list">
            {wells.map((well) => (
              <li key={`${well.origin}:${String(well.id)}`}>
                <button
                  type="button"
                  aria-current={
                    well.slug === selectedSlug && well.origin === selectedOrigin
                      ? 'true'
                      : undefined
                  }
                  onClick={() => {
                    onSelectWell(well);
                  }}
                >
                  {well.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {selectedOrigin === 'imported' && (
        <p className="well-sheet__notice">{messages.wellSheet.importedNotice}</p>
      )}

      <div className="well-sheet__tabs" role="tablist" aria-label={messages.wellSheet.tabs.label}>
        {TABS.map((candidate) => (
          <button
            key={candidate}
            id={`${headingId}-${candidate}`}
            type="button"
            role="tab"
            aria-selected={tab === candidate}
            aria-controls={`${headingId}-panel`}
            tabIndex={tab === candidate ? 0 : -1}
            className="well-sheet__tab"
            onClick={() => {
              onTabChange(candidate);
            }}
          >
            {messages.wellSheet.tabs[candidate]}
          </button>
        ))}
      </div>

      <div id={`${headingId}-panel`} role="tabpanel" aria-labelledby={`${headingId}-${tab}`}>
        {tab === 'summary' && (
          <>
            {isLoading && (
              <p className="well-sheet__notice" role="status">
                {messages.wellSheet.loading}
              </p>
            )}
            {isCurrent && state.status === 'error' && (
              <p className="well-sheet__notice well-sheet__notice--error" role="alert">
                {messages.wellSheet.loadError}
              </p>
            )}
            {detail !== null && (
              <>
                <WellSheetDetails detail={detail} />
                <WellExport
                  detail={detail}
                  production={productionData}
                  origin={selectedOrigin}
                  slug={selectedSlug}
                />
              </>
            )}
            {wellAlerts.length > 0 && (
              <section className="well-sheet__alerts">
                <h3>{messages.alerts.title}</h3>
                <AlertsList alerts={wellAlerts} />
              </section>
            )}
          </>
        )}

        {tab !== 'summary' && (
          <>
            {(tab === 'production' || tab === 'operation' || tab === 'trajectory') && (
              <fieldset className="well-sheet__units">
                <legend>{messages.wellSheet.units.legend}</legend>
                {(['si', 'field'] as const).map((system) => (
                  <label key={system}>
                    <input
                      type="radio"
                      name="well-sheet-units"
                      value={system}
                      checked={unitSystem === system}
                      onChange={() => {
                        onUnitSystemChange(system);
                      }}
                    />
                    {messages.wellSheet.units[system]}
                  </label>
                ))}
              </fieldset>
            )}
            {tab === 'trajectory' && (
              <>
                {isTrajectoryLoading && (
                  <p className="well-sheet__notice" role="status">
                    {messages.wellSheet.loading}
                  </p>
                )}
                {isTrajectoryError && (
                  <p className="well-sheet__notice well-sheet__notice--error" role="alert">
                    {messages.wellSheet.seriesError}
                  </p>
                )}
                {trajectoryData !== null && (
                  <LazyTrajectoryChart data={trajectoryData} unitSystem={unitSystem} />
                )}
              </>
            )}
            {tab === 'logs' && (
              <>
                {selectedOrigin === 'imported' ? (
                  <p className="well-sheet__notice">
                    {messages.wellSheet.logs.unavailableForImported}
                  </p>
                ) : (
                  <>
                    {isLogsLoading && (
                      <p className="well-sheet__notice" role="status">
                        {messages.wellSheet.logs.loading}
                      </p>
                    )}
                    {isLogsError && (
                      <p className="well-sheet__notice well-sheet__notice--error" role="alert">
                        {messages.wellSheet.logs.error}
                      </p>
                    )}
                    {logsData !== null &&
                      (logsData.curves.length === 0 ? (
                        <p className="well-sheet__notice">{messages.wellSheet.logs.noData}</p>
                      ) : (
                        <LogsChart curves={logsData.curves} source={logsData.source} />
                      ))}
                  </>
                )}
              </>
            )}
            {(tab === 'production' || tab === 'operation') && (
              <>
                {isProductionLoading && (
                  <p className="well-sheet__notice" role="status">
                    {messages.wellSheet.loading}
                  </p>
                )}
                {isProductionError && (
                  <p className="well-sheet__notice well-sheet__notice--error" role="alert">
                    {messages.wellSheet.seriesError}
                  </p>
                )}
                {productionData !== null && (
                  <>
                    <LazyProductionCharts
                      key={`${selectedKey}:${tab}`}
                      data={productionData}
                      unitSystem={unitSystem}
                      section={tab}
                      fitWindow={fitWindow}
                      onFitWindowChange={onFitWindowChange}
                      groupId={chartGroupId}
                    />
                    {tab === 'production' && detail !== null && (
                      <WellComparison
                        current={{ key: currentKey, name: detail.name, data: productionData }}
                        fieldSlug={detail.field?.slug ?? null}
                        importedWells={importedWells}
                        compareKeys={compareKeys}
                        onCompareKeysChange={onCompareKeysChange}
                        unitSystem={unitSystem}
                        groupId={chartGroupId}
                      />
                    )}
                  </>
                )}
              </>
            )}
            {(tab === 'engineering' || tab === 'diagnostics') && (
              <>
                {isProductionLoading && (
                  <p className="well-sheet__notice" role="status">
                    {messages.wellSheet.loading}
                  </p>
                )}
                {isProductionError && (
                  <p className="well-sheet__notice well-sheet__notice--error" role="alert">
                    {messages.wellSheet.seriesError}
                  </p>
                )}
                {productionData !== null &&
                  (tab === 'engineering' ? (
                    <LazyEngineeringTab data={productionData} />
                  ) : (
                    <LazyDiagnosticsTab data={productionData} />
                  ))}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function WellExport({
  detail,
  production,
  origin,
  slug,
}: {
  detail: WellDetail;
  production: ProductionSeries | null;
  origin: WellOrigin;
  slug: string;
}) {
  const messages = useMessages();
  if (origin === 'public') {
    return (
      <p className="well-sheet__export">
        <a href={wellExportUrl(slug)} download>
          {messages.wellSheet.exportCsv}
        </a>
        <span>{messages.wellSheet.exportCsvNote}</span>
      </p>
    );
  }
  return (
    <p className="well-sheet__export">
      <button
        type="button"
        disabled={production === null}
        onClick={() => {
          if (production !== null) {
            downloadCsv(`${safeFileName(detail.name)}.csv`, productionTable(detail, production));
          }
        }}
      >
        {messages.wellSheet.exportCsv}
      </button>
      <span>{messages.wellSheet.exportCsvNote}</span>
    </p>
  );
}

function WellSheetDetails({ detail }: { detail: WellDetail }) {
  const { locale, messages } = useLocale();
  const field = detail.field;
  const daily = detail.series.daily;

  return (
    <div className="well-sheet__content">
      <dl className="well-sheet__facts">
        <dt>{messages.wellSheet.status}</dt>
        <dd>{messages.wellStatus[detail.status]}</dd>
        <dt>{messages.wellSheet.type}</dt>
        <dd>
          {detail.wellType === null
            ? messages.wellSheet.noData
            : messages.wellType[detail.wellType]}
        </dd>
        <dt>{messages.wellSheet.field}</dt>
        <dd>{field?.name ?? messages.wellSheet.noData}</dd>
        {field?.operator !== null && field?.operator !== undefined && (
          <>
            <dt>{messages.wellSheet.operator}</dt>
            <dd>{field.operator}</dd>
          </>
        )}
        <dt>{messages.wellSheet.spudDate}</dt>
        <dd>
          {detail.spudDate === null
            ? messages.wellSheet.noData
            : formatDate(detail.spudDate, locale)}
        </dd>
        <dt>{messages.wellSheet.totalDepth}</dt>
        <dd>
          {detail.totalDepthM === null
            ? messages.wellSheet.noData
            : `${formatDepth(detail.totalDepthM, locale)} m`}
        </dd>
      </dl>

      <section className="well-sheet__section">
        <h3>{messages.wellSheet.location}</h3>
        <p>
          {formatCoordinate(detail.location.latDeg, locale)},{' '}
          {formatCoordinate(detail.location.lonDeg, locale)}
        </p>
        <a
          href={openStreetMapUrl(detail.location.latDeg, detail.location.lonDeg)}
          target="_blank"
          rel="noreferrer"
        >
          {messages.wellSheet.openInOsm}
        </a>
      </section>

      <section className="well-sheet__section">
        <h3>{messages.wellSheet.series}</h3>
        <dl className="well-sheet__facts">
          <dt>{messages.wellSheet.daily}</dt>
          <dd>
            {daily === null
              ? messages.wellSheet.noDaily
              : messages.wellSheet.dailyRange(
                  formatDate(daily.from, locale),
                  formatDate(daily.to, locale),
                  daily.days,
                )}
          </dd>
          <dt>{messages.wellSheet.trajectoryLabel}</dt>
          <dd>
            {detail.series.hasTrajectory
              ? messages.wellSheet.available
              : messages.wellSheet.unavailable}
          </dd>
          <dt>{messages.wellSheet.logCurves}</dt>
          <dd>
            {detail.series.logCurves.length === 0
              ? messages.wellSheet.noLogs
              : detail.series.logCurves.join(', ')}
          </dd>
        </dl>
      </section>

      <footer className="well-sheet__source">
        <h3>{messages.wellSheet.source}</h3>
        <p>
          {detail.source.url === '' ? (
            detail.source.name
          ) : (
            <a href={detail.source.url} target="_blank" rel="noreferrer">
              {detail.source.name}
            </a>
          )}
        </p>
        <p>
          {messages.wellSheet.license}: {detail.source.license}
        </p>
      </footer>
    </div>
  );
}
