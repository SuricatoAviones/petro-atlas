/**
 * Alerts as the interface shows them, whatever their origin (docs/09, "Alertas"): the API
 * computes the ones of the public wells with the view `well_alert`, and the browser computes
 * the ones of the imported wells with `petro-calc/alerts`. Both use the same thresholds.
 */
import {
  alertIndicators,
  evaluate,
  type AlertKind,
  type AlertLevel,
} from '@suricatoaviones/petro-calc';
import type { AlertItem } from '@petroatlas/shared-types';

import type { ImportedWell } from './imported-wells';
import type { WellOrigin } from './well-repository';

export interface WellAlert {
  origin: WellOrigin;
  /** Database id of a public well; null for an imported one. */
  wellId: number | null;
  wellSlug: string;
  wellName: string;
  level: AlertLevel;
  kinds: AlertKind[];
  /** Last date with data of the well; the rules are measured from it. */
  asOf: string;
  detail: AlertItem['detail'];
}

export function publicWellAlert(alert: AlertItem): WellAlert {
  return { ...alert, origin: 'public' };
}

/** Evaluates the alert rules over the stored series of an imported well. */
export function importedWellAlert(well: ImportedWell): WellAlert | null {
  const { oil, gas, water } = well.series;
  const series = {
    dates: well.dates,
    oil,
    gas,
    water,
    // The CSV has no well type. A well that never reported oil or gas is not a producer, so the
    // no-production rule does not apply to it (docs/09: an injector raises no such alert).
    isActiveProducer: [...oil, ...gas].some((value) => value !== null && value > 0),
  };
  const alerts = evaluate(series);
  const indicators = alertIndicators(series);
  if (alerts.length === 0 || indicators === null) return null;

  return {
    origin: 'imported',
    wellId: null,
    wellSlug: well.slug,
    wellName: well.name,
    level: alerts.some((alert) => alert.level === 'critical') ? 'critical' : 'warning',
    kinds: alerts.map((alert) => alert.kind),
    asOf: indicators.asOf,
    detail: {
      oil7d: indicators.oilRecent,
      oilPrev30: indicators.oilBaseline,
      waterCut7d: indicators.waterCutRecent,
      prod3d: indicators.productionLastDays,
    },
  };
}

/** Critical first, then the most recent data, like `GET /api/alerts`. */
export function sortAlerts(alerts: readonly WellAlert[]): WellAlert[] {
  return [...alerts].sort(
    (left, right) =>
      Number(right.level === 'critical') - Number(left.level === 'critical') ||
      right.asOf.localeCompare(left.asOf) ||
      left.wellName.localeCompare(right.wellName, 'es'),
  );
}
