/**
 * Grid margins for the ECharts charts.
 *
 * Fixed pixels on purpose: charts that share the time axis must keep identical
 * plot rectangles so their zoom and cursor line up (docs/07, rule 1). Instead of
 * switching to `containLabel`, which would give each chart a different plot
 * area, the margins scale with the measured container width.
 */
export interface ChartGridMargins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Below this container width the charts use the compact margins. */
export const COMPACT_CHART_WIDTH_PX = 480;

export function chartGridMargins(compact: boolean, hasRightAxis: boolean): ChartGridMargins {
  if (compact) {
    return { left: 40, right: hasRightAxis ? 46 : 10, top: 26, bottom: 10 };
  }
  return { left: 52, right: hasRightAxis ? 58 : 18, top: 32, bottom: 12 };
}

/** Margins of the trajectory chart, which carries axis names on two sides. */
export function trajectoryGridMargins(compact: boolean): ChartGridMargins {
  if (compact) {
    return { left: 44, right: 10, top: 30, bottom: 26 };
  }
  return { left: 56, right: 24, top: 36, bottom: 32 };
}

/** Vertical margins of the log tracks, whose sides are percent-based. */
export function logTrackMargins(compact: boolean): Pick<ChartGridMargins, 'top' | 'bottom'> {
  if (compact) {
    return { top: 36, bottom: 34 };
  }
  return { top: 44, bottom: 44 };
}
