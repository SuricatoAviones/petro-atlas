'use client';

import type { SourceRef } from '@petroatlas/shared-types';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef } from 'react';

import type { TableData } from '@/lib/export';

import { chartGridMargins, COMPACT_CHART_WIDTH_PX } from './chart-grid';
import { ChartSource, ChartTools, PNG_EXPORT_OPTIONS } from './chart-tools';
import { useMessages } from './locale-provider';
import { useElementWidth } from './use-element-width';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

interface EngineeringSeries {
  name: string;
  color: string;
  values: readonly (number | null)[];
  axis?: number;
}

interface EngineeringAxis {
  name: string;
  position?: 'left' | 'right';
}

export interface EngineeringChartProps {
  title: string;
  xType: 'time' | 'value';
  xValues: readonly (string | number)[];
  series: readonly EngineeringSeries[];
  axes: readonly EngineeringAxis[];
  source?: SourceRef;
  note?: string;
  logX?: boolean;
  logY?: boolean;
  /** Header of the first CSV column; it defaults to the date for time charts. */
  xLabel?: string;
}

/** Small line chart used by the Engineering and Diagnostics tabs. */
export function EngineeringChart({
  title,
  xType,
  xValues,
  series,
  axes,
  source,
  note,
  logX = false,
  logY = false,
  xLabel,
}: EngineeringChartProps) {
  const messages = useMessages();
  const { ref: containerRef, width } = useElementWidth<HTMLDivElement>();
  const compact = width > 0 && width < COMPACT_CHART_WIDTH_PX;
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const table = useMemo(
    (): TableData => ({
      headers: [
        xLabel ?? (xType === 'time' ? messages.wellSheet.charts.date : 'x'),
        ...series.map((item) => item.name),
      ],
      rows: xValues.map((value, index) => [
        value,
        ...series.map((item) => item.values[index] ?? null),
      ]),
    }),
    [messages, series, xLabel, xType, xValues],
  );

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
  }, [containerRef]);

  useEffect(() => {
    const x = (value: string | number): string | number =>
      xType === 'time' && typeof value === 'string' ? `${value} 00:00:00` : value;
    chartRef.current?.setOption(
      {
        animation: false,
        tooltip: { trigger: 'axis' },
        legend: { top: 0, textStyle: { fontSize: 10 }, itemWidth: 14, itemHeight: 8 },
        grid: chartGridMargins(compact, axes.length > 1),
        xAxis: {
          type: logX ? 'log' : xType,
          boundaryGap: false,
          axisLabel: { fontSize: 10 },
        },
        yAxis: axes.map((axis, index) => ({
          type: logY ? 'log' : 'value',
          name: axis.name,
          position: axis.position ?? (index === 0 ? 'left' : 'right'),
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
          splitLine: { show: index === 0 },
          ...(logY ? { logBase: 10 } : {}),
        })),
        dataZoom: xType === 'time' ? [{ type: 'inside', xAxisIndex: 0 }] : [],
        series: series.map((item) => ({
          type: 'line',
          name: item.name,
          data: xValues.map((value, index) => [x(value), item.values[index] ?? null]),
          showSymbol: false,
          connectNulls: false,
          lineStyle: { width: 1.5, color: item.color },
          itemStyle: { color: item.color },
          yAxisIndex: item.axis ?? 0,
        })),
      } satisfies echarts.EChartsCoreOption,
      true,
    );
  }, [axes, compact, logX, logY, series, xType, xValues]);

  return (
    <section className="chart-card">
      <h3>{title}</h3>
      <div ref={containerRef} className="chart-card__canvas" role="img" aria-label={title} />
      {note !== undefined && <p className="chart-card__note">{note}</p>}
      {source !== undefined && <ChartSource source={source} />}
      <ChartTools
        title={title}
        table={table}
        getImage={() => chartRef.current?.getDataURL(PNG_EXPORT_OPTIONS) ?? null}
      />
    </section>
  );
}
