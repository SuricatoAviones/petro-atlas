'use client';

import type { WellDetail } from '@petroatlas/shared-types';
import { useEffect, useId, useRef, useState } from 'react';

import { messages } from '@/messages/es';
import { fetchWellDetail } from '@/lib/api';

import type { WellAtPoint } from './well-map';

export interface WellSelection {
  /** Known when the well comes from a map click; null when the URL only carries the slug. */
  id: number | null;
  slug: string;
  name: string | null;
}

interface WellSheetProps {
  /** Wells drawn under the click; the API can place several at the same coordinates. */
  wells: readonly WellAtPoint[];
  selectedWell: WellSelection;
  onSelectWell: (well: WellAtPoint) => void;
  onClose: () => void;
}

interface DetailState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  slug: string | null;
  detail: WellDetail | null;
}

const IDLE_STATE: DetailState = { status: 'idle', slug: null, detail: null };

const DATE_FORMATTER = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
const DEPTH_FORMATTER = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });
const COORDINATE_FORMATTER = new Intl.NumberFormat('es', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 5,
});

function formatDate(isoDate: string): string {
  return DATE_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
}

function openStreetMapUrl(latDeg: number, lonDeg: number): string {
  return `https://www.openstreetmap.org/?mlat=${String(latDeg)}&mlon=${String(lonDeg)}#map=13/${String(latDeg)}/${String(lonDeg)}`;
}

/** Metadata and location of a well (RF-03, phase 1). Tabs for series arrive in phase 2. */
export function WellSheet({ wells, selectedWell, onSelectWell, onClose }: WellSheetProps) {
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<DetailState>(IDLE_STATE);
  const selectedId = selectedWell.id;
  const selectedSlug = selectedWell.slug;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchWellDetail(selectedId ?? selectedSlug, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) {
          setState({ status: 'ready', slug: selectedSlug, detail });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', slug: selectedSlug, detail: null });
        }
      });
    return () => {
      controller.abort();
    };
  }, [selectedId, selectedSlug]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isCurrent = state.slug === selectedSlug;
  const detail = isCurrent && state.status === 'ready' ? state.detail : null;
  const isLoading = !isCurrent || state.status === 'idle' || state.status === 'loading';

  return (
    <aside className="well-sheet" aria-labelledby={headingId}>
      <div className="well-sheet__header">
        <div>
          <h2 id={headingId}>{detail?.name ?? messages.wellSheet.title}</h2>
          {detail !== null && <p className="well-sheet__subtitle">{detail.slug}</p>}
        </div>
        <button
          ref={closeRef}
          type="button"
          className="well-sheet__close"
          aria-label={messages.wellSheet.close}
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {wells.length > 1 && (
        <nav aria-label={messages.wellSheet.wellsAtPoint}>
          <ul className="well-sheet__list">
            {wells.map((well) => (
              <li key={well.id}>
                <button
                  type="button"
                  aria-current={well.slug === selectedSlug ? 'true' : undefined}
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
      {detail !== null && <WellSheetDetails detail={detail} />}
    </aside>
  );
}

function WellSheetDetails({ detail }: { detail: WellDetail }) {
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
          {detail.spudDate === null ? messages.wellSheet.noData : formatDate(detail.spudDate)}
        </dd>
        <dt>{messages.wellSheet.totalDepth}</dt>
        <dd>
          {detail.totalDepthM === null
            ? messages.wellSheet.noData
            : `${DEPTH_FORMATTER.format(detail.totalDepthM)} m`}
        </dd>
      </dl>

      <section className="well-sheet__section">
        <h3>{messages.wellSheet.location}</h3>
        <p>
          {COORDINATE_FORMATTER.format(detail.location.latDeg)},{' '}
          {COORDINATE_FORMATTER.format(detail.location.lonDeg)}
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
                  formatDate(daily.from),
                  formatDate(daily.to),
                  daily.days,
                )}
          </dd>
          <dt>{messages.wellSheet.trajectory}</dt>
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
          <a href={detail.source.url} target="_blank" rel="noreferrer">
            {detail.source.name}
          </a>
        </p>
        <p>
          {messages.wellSheet.license}: {detail.source.license}
        </p>
      </footer>
    </div>
  );
}
