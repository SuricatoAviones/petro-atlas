'use client';

import type { LogCurve, SourceRef } from '@petroatlas/shared-types';
import type { Messages } from '@/messages';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef } from 'react';

import type { TableData } from '@/lib/export';

import { ChartSource, ChartTools, PNG_EXPORT_OPTIONS } from './chart-tools';
import { useMessages } from './locale-provider';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

/** Mnemonic families, in the order a log analyst reads them (docs/07, "Registros"). */
const FAMILY_ORDER = [
  'GR',
  'SP',
  'CALI',
  'RT',
  'ILD',
  'LLD',
  'LLS',
  'MSFL',
  'RES',
  'RHOB',
  'NPHI',
  'DT',
  'DTC',
  'DTS',
];
const RESISTIVITY = new Set(['RT', 'ILD', 'LLD', 'LLS', 'MSFL', 'RES']);
const LOG_TRACK_COLOR = '#1f4e5f';

function familyRank(mnemonic: string): number {
  const index = FAMILY_ORDER.indexOf(mnemonic.toUpperCase());
  return index === -1 ? FAMILY_ORDER.length : index;
}

function isLogScale(mnemonic: string): boolean {
  return RESISTIVITY.has(mnemonic.toUpperCase());
}

function depthOf(curve: LogCurve, index: number): number {
  return curve.topM + index * curve.stepM;
}

function trackName(curve: LogCurve, messages: Messages): string {
  return messages.wellSheet.logs.trackLabel(curve.mnemonic, curve.unit);
}

function chartOption(curves: readonly LogCurve[], messages: Messages): echarts.EChartsCoreOption {
  const count = Math.max(1, curves.length);
  const width = 93 / count;
  return {
    animation: false,
    axisPointer: { link: [{ yAxisIndex: 'all' }] },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: curves.map((curve, index) => ({
      left: `${String(7 + index * width)}%`,
      width: `${String(width - 2)}%`,
      top: 44,
      bottom: 44,
    })),
    xAxis: curves.map((curve, index) => ({
      type: isLogScale(curve.mnemonic) ? 'log' : 'value',
      gridIndex: index,
      name: trackName(curve, messages),
      nameLocation: 'middle',
      nameGap: 24,
      scale: true,
      axisLabel: { fontSize: 9 },
      splitLine: { show: false },
    })),
    yAxis: curves.map((curve, index) => ({
      type: 'value',
      gridIndex: index,
      inverse: true,
      scale: true,
      name: index === 0 ? messages.wellSheet.logs.depth : '',
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 40,
      nameTextStyle: { fontSize: 10 },
      axisLabel: { show: index === 0, fontSize: 9 },
      splitLine: { show: index === 0 },
    })),
    dataZoom: [{ type: 'inside', yAxisIndex: 'all' }],
    series: curves.map((curve, index) => ({
      type: 'line',
      name: trackName(curve, messages),
      xAxisIndex: index,
      yAxisIndex: index,
      showSymbol: false,
      connectNulls: false,
      data: curve.values.map((value, sample) => [
        value === null || (isLogScale(curve.mnemonic) && value <= 0) ? null : value,
        depthOf(curve, sample),
      ]),
      lineStyle: { width: 1.2, color: LOG_TRACK_COLOR },
      itemStyle: { color: LOG_TRACK_COLOR },
    })),
  };
}

function logTable(curves: readonly LogCurve[], messages: Messages): TableData {
  const depths = new Set<number>();
  for (const curve of curves) {
    curve.values.forEach((_, index) => {
      depths.add(Number(depthOf(curve, index).toFixed(3)));
    });
  }
  const sorted = [...depths].sort((left, right) => left - right);
  const valuesByCurve = curves.map((curve) => {
    const map = new Map<number, number | null>();
    curve.values.forEach((value, index) => {
      map.set(Number(depthOf(curve, index).toFixed(3)), value);
    });
    return map;
  });
  return {
    headers: [messages.wellSheet.logs.depth, ...curves.map((curve) => trackName(curve, messages))],
    rows: sorted.map((depth) => [
      depth,
      ...valuesByCurve.map((values) => values.get(depth) ?? null),
    ]),
  };
}

export interface LogsChartProps {
  curves: readonly LogCurve[];
  source: SourceRef;
}

/** Depth tracks of the log curves of a well (docs/07, "Registros"). */
export function LogsChart({ curves, source }: LogsChartProps) {
  const messages = useMessages();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const sorted = useMemo(
    () => [...curves].sort((left, right) => familyRank(left.mnemonic) - familyRank(right.mnemonic)),
    [curves],
  );
  const table = useMemo(() => logTable(sorted, messages), [messages, sorted]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const chart = echarts.init(container);
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
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(chartOption(sorted, messages), true);
  }, [messages, sorted]);

  return (
    <section className="chart-card">
      <div className="chart-card__header">
        <h4>{messages.wellSheet.logs.title}</h4>
      </div>
      <p className="production-charts__hint">{messages.wellSheet.logs.zoomHint}</p>
      <div
        ref={containerRef}
        className="chart-card__canvas chart-card__canvas--logs"
        role="img"
        aria-label={`${messages.wellSheet.logs.title}: ${sorted.map((curve) => curve.mnemonic).join(', ')}`}
      />
      <ChartSource source={source} />
      <ChartTools
        title={messages.wellSheet.logs.title}
        table={table}
        getImage={() => chartRef.current?.getDataURL(PNG_EXPORT_OPTIONS) ?? null}
      />
    </section>
  );
}
