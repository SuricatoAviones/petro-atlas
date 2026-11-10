'use client';

import type { AlertItem } from '@petroatlas/shared-types';

import { messages } from '@/messages/es';

const NUMBER_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
const PERCENT_FORMAT = new Intl.NumberFormat('es', {
  style: 'percent',
  maximumFractionDigits: 1,
});

interface AlertsListProps {
  alerts: readonly AlertItem[];
  onOpenWell?: (alert: AlertItem) => void;
}

function AlertDetails({ alert }: { alert: AlertItem }) {
  return (
    <dl className="alert-item__details">
      {alert.kinds.includes('production_drop') && (
        <>
          <dt>{messages.alerts.detail.oil7d}</dt>
          <dd>{alert.detail.oil7d === null ? '—' : NUMBER_FORMAT.format(alert.detail.oil7d)}</dd>
          <dt>{messages.alerts.detail.oilPrev30}</dt>
          <dd>
            {alert.detail.oilPrev30 === null ? '—' : NUMBER_FORMAT.format(alert.detail.oilPrev30)}
          </dd>
        </>
      )}
      {alert.kinds.includes('high_water_cut') && (
        <>
          <dt>{messages.alerts.detail.waterCut7d}</dt>
          <dd>
            {alert.detail.waterCut7d === null
              ? '—'
              : PERCENT_FORMAT.format(alert.detail.waterCut7d)}
          </dd>
        </>
      )}
      {alert.kinds.includes('no_production') && (
        <>
          <dt>{messages.alerts.detail.prod3d}</dt>
          <dd>{alert.detail.prod3d === null ? '—' : NUMBER_FORMAT.format(alert.detail.prod3d)}</dd>
        </>
      )}
    </dl>
  );
}

/** Alerts ordered by the API: critical first, then the most recent data. */
export function AlertsList({ alerts, onOpenWell }: AlertsListProps) {
  if (alerts.length === 0) return <p className="alerts-empty">{messages.alerts.empty}</p>;

  return (
    <ul className="alerts-list">
      {alerts.map((alert) => (
        <li key={alert.wellId}>
          <article className={`alert-item alert-item--${alert.level}`}>
            <div className="alert-item__header">
              <span className="alert-item__level">{messages.alerts.level[alert.level]}</span>
              {onOpenWell === undefined ? (
                <strong>{alert.wellName}</strong>
              ) : (
                <button
                  type="button"
                  className="alert-item__well"
                  onClick={() => {
                    onOpenWell(alert);
                  }}
                >
                  {alert.wellName}
                </button>
              )}
              <span className="alert-item__date">
                {messages.alerts.asOf} {alert.asOf}
              </span>
            </div>
            <ul className="alert-item__kinds">
              {alert.kinds.map((kind) => (
                <li key={kind}>{messages.alerts.kinds[kind]}</li>
              ))}
            </ul>
            <AlertDetails alert={alert} />
          </article>
        </li>
      ))}
    </ul>
  );
}
