'use client';

import type { SourceRef } from '@petroatlas/shared-types';
import { toField, type Quantity } from '@petroatlas/petro-calc';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef } from 'react';

import type { TableData } from '@/lib/export';
import type { UnitSystem } from '@/lib/sheet-state';
import { messages } from '@/messages/es';

import { ChartSource, ChartTools, PNG_EXPORT_OPTIONS } from './chart-tools';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  CanvasRenderer,
]);

/** Line styles that tell wells apart in a comparison; colour keeps meaning the fluid. */
export type LineType = 'solid' | 'dashed' | 'dotted' | number[];

export interface ChartSeries {
  name: string;
  color: string;
  values: readonly (number | null)[];
  /** Index into `axes`; defaults to the left axis. */
  axis?: number;
  lineType?: LineType;
}

export interface ChartAxis {
  name: string;
  position?: 'left' | 'right';
}

export interface SeriesChartProps {
  title: string;
  dates: readonly string[];
  series: readonly ChartSeries[];
  axes: readonly ChartAxis[];
  source: SourceRef | readonly SourceRef[];
  closedDates: readonly string[];
  groupId: string;
  onSelectVisibleRange?: (startDate: string, endDate: string) => void;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.toISOString().slice(0, 10)} 00:00:00`;
}

function chartOption({
  dates,
  series,
  axes,
  closedDates,
}: Pick<SeriesChartProps, 'dates' | 'series' | 'axes' | 'closedDates'>): echarts.EChartsCoreOption {
  const closedRanges = closedDates.map((date) => [
    { xAxis: `${date} 00:00:00` },
    { xAxis: addDays(date, 1) },
  ]);
  return {
    animation: false,
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: {
      top: 0,
      textStyle: { fontSize: 10 },
      itemWidth: 22,
      itemHeight: 8,
    },
    grid: { left: 52, right: axes.length > 1 ? 58 : 18, top: 32, bottom: 12 },
    xAxis: {
      type: 'time',
      boundaryGap: false,
      axisLabel: { fontSize: 10 },
    },
    yAxis: axes.map((axis, index) => ({
      type: 'value',
      name: axis.name,
      position: axis.position ?? (index === 0 ? 'left' : 'right'),
      scale: true,
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 10 },
      splitLine: { show: index === 0 },
    })),
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
    series: series.map((item, index) => ({
      type: 'line',
      name: item.name,
      data: dates.map((date, dateIndex) => [`${date} 00:00:00`, item.values[dateIndex] ?? null]),
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 1.5, color: item.color, type: item.lineType ?? 'solid' },
      itemStyle: { color: item.color },
      yAxisIndex: item.axis ?? 0,
      markArea:
        index === 0 && closedRanges.length > 0
          ? {
              silent: true,
              itemStyle: { color: 'rgb(107 119 128 / 12%)' },
              data: closedRanges,
            }
          : undefined,
    })),
  };
}

/** Line chart over time. Charts of the same `groupId` share zoom and cursor (docs/07, rule 1). */
export function SeriesChart({
  title,
  dates,
  series,
  axes,
  source,
  closedDates,
  groupId,
  onSelectVisibleRange,
}: SeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const chart = echarts.init(container);
    chart.group = groupId;
    echarts.connect(groupId);
    chartRef.current = chart;
    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      chartRef.current = null;
      chart.dispose();
    };
  }, [groupId]);

  useEffect(() => {
    chartRef.current?.setOption(chartOption({ dates, series, axes, closedDates }), true);
  }, [axes, closedDates, dates, series]);

  /** Indices of the first and last date inside the current zoom window. */
  const visibleRange = (): [number, number] | null => {
    const option: unknown = chartRef.current?.getOption();
    const root =
      typeof option === 'object' && option !== null ? (option as Record<string, unknown>) : null;
    const dataZoom = root?.dataZoom;
    const zooms: unknown[] = Array.isArray(dataZoom) ? dataZoom : [];
    const first = zooms[0];
    const zoom =
      typeof first === 'object' && first !== null ? (first as Record<string, unknown>) : null;
    const startPercent = typeof zoom?.start === 'number' ? zoom.start : 0;
    const endPercent = typeof zoom?.end === 'number' ? zoom.end : 100;
    const lastIndex = dates.length - 1;
    if (lastIndex < 0) return null;
    const clamp = (percent: number): number =>
      Math.min(lastIndex, Math.max(0, Math.round((percent / 100) * lastIndex)));
    const startIndex = clamp(startPercent);
    const endIndex = clamp(endPercent);
    return [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
  };

  const useVisibleRange = (): void => {
    const range = visibleRange();
    if (onSelectVisibleRange === undefined || range === null) return;
    const startDate = dates[range[0]];
    const endDate = dates[range[1]];
    if (startDate === undefined || endDate === undefined) return;
    onSelectVisibleRange(startDate, endDate);
  };

  const table = useMemo(
    (): TableData => ({
      headers: [messages.wellSheet.charts.date, ...series.map((item) => item.name)],
      rows: dates.map((date, index) => [date, ...series.map((item) => item.values[index] ?? null)]),
    }),
    [dates, series],
  );

  return (
    <section className="chart-card">
      <div className="chart-card__header">
        <h4>{title}</h4>
        {onSelectVisibleRange !== undefined && (
          <button type="button" className="chart-card__action" onClick={useVisibleRange}>
            {messages.wellSheet.fit.useView}
          </button>
        )}
      </div>
      <div ref={containerRef} className="chart-card__canvas" role="img" aria-label={title} />
      <ChartSource source={source} />
      <ChartTools
        title={title}
        table={table}
        getCsvTable={() => {
          // The CSV holds what the chart shows: the rows inside the zoom window (docs/07).
          const range = visibleRange();
          return range === null
            ? table
            : { headers: table.headers, rows: table.rows.slice(range[0], range[1] + 1) };
        }}
        getImage={() => chartRef.current?.getDataURL(PNG_EXPORT_OPTIONS) ?? null}
      />
    </section>
  );
}

export function convertSeries(
  values: readonly (number | null)[],
  quantity: Quantity,
  unitSystem: UnitSystem,
): (number | null)[] {
  if (unitSystem === 'si') return [...values];
  return values.map((value) => (value === null ? null : toField(value, quantity)));
}

export function unitOf(quantity: Quantity, unitSystem: UnitSystem): string {
  const si: Record<Quantity, string> = {
    pressure: 'bar',
    liquidVolume: 'Sm³',
    gasVolume: 'Sm³',
    gasOilRatio: 'Sm³/Sm³',
    temperature: '°C',
    length: 'm',
  };
  const field: Record<Quantity, string> = {
    pressure: 'psi',
    liquidVolume: 'bbl',
    gasVolume: 'scf',
    gasOilRatio: 'scf/STB',
    temperature: '°F',
    length: 'ft',
  };
  return unitSystem === 'si' ? si[quantity] : field[quantity];
}
