'use client';

import type { SourceRef, WellProductionResponse } from '@petroatlas/shared-types';
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
import { useEffect, useId, useRef, useState } from 'react';

import { messages } from '@/messages/es';

import type { UnitSystem } from '@/lib/sheet-state';

import { CHART_COLORS } from './chart-colors';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  CanvasRenderer,
]);

const NUMBER_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

interface ChartSeries {
  name: string;
  color: string;
  values: readonly (number | null)[];
  /** Index into `axes`; defaults to the left axis. */
  axis?: number;
}

interface ChartAxis {
  name: string;
  position?: 'left' | 'right';
}

interface SeriesChartProps {
  title: string;
  dates: readonly string[];
  series: readonly ChartSeries[];
  axes: readonly ChartAxis[];
  source: SourceRef;
  closedDates: readonly string[];
  groupId: string;
}

function formatValue(value: number | null): string {
  return value === null ? '—' : NUMBER_FORMAT.format(value);
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
      itemWidth: 14,
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
      lineStyle: { width: 1.5, color: item.color },
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

function SeriesChart({
  title,
  dates,
  series,
  axes,
  source,
  closedDates,
  groupId,
}: SeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [showTable, setShowTable] = useState(false);

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

  return (
    <section className="chart-card">
      <h4>{title}</h4>
      <div ref={containerRef} className="chart-card__canvas" role="img" aria-label={title} />
      <p className="chart-card__source">
        {messages.wellSheet.charts.source}:{' '}
        <a href={source.url} target="_blank" rel="noreferrer">
          {source.name}
        </a>{' '}
        · {source.license}
      </p>
      <button
        type="button"
        className="chart-card__table-toggle"
        aria-expanded={showTable}
        onClick={() => {
          setShowTable((current) => !current);
        }}
      >
        {showTable ? messages.wellSheet.charts.hideTable : messages.wellSheet.charts.table}
      </button>
      {showTable && (
        <div className="chart-card__table-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">{messages.wellSheet.charts.date}</th>
                {series.map((item) => (
                  <th key={item.name} scope="col">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date, index) => (
                <tr key={date}>
                  <th scope="row">{date}</th>
                  {series.map((item) => (
                    <td key={item.name}>{formatValue(item.values[index] ?? null)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function convertSeries(
  values: readonly (number | null)[],
  quantity: Quantity,
  unitSystem: UnitSystem,
): (number | null)[] {
  if (unitSystem === 'si') return [...values];
  return values.map((value) => (value === null ? null : toField(value, quantity)));
}

function unitOf(quantity: Quantity, unitSystem: UnitSystem): string {
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

function cumulative(values: readonly (number | null)[]): (number | null)[] {
  let total = 0;
  return values.map((value) => {
    if (value === null) return null;
    total += value;
    return total;
  });
}

function hasAny(values: readonly (number | null)[]): boolean {
  return values.some((value) => value !== null);
}

function waterCutSeries(data: WellProductionResponse): (number | null)[] {
  return data.series.oil.map((oil, index) => {
    const water = data.series.water[index] ?? null;
    if (oil === null || water === null || oil + water === 0) return null;
    return (water / (oil + water)) * 100;
  });
}

function gorSeries(data: WellProductionResponse): (number | null)[] {
  return data.series.gas.map((gas, index) => {
    const oil = data.series.oil[index] ?? null;
    return gas === null || oil === null || oil <= 0 ? null : gas / oil;
  });
}

export type ChartSection = 'production' | 'operation';

export interface ProductionChartsProps {
  data: WellProductionResponse;
  unitSystem: UnitSystem;
  section: ChartSection;
}

/** Charts of the Production and Operation tabs (docs/07). All charts share a time zoom. */
export function ProductionCharts({ data, unitSystem, section }: ProductionChartsProps) {
  const groupId = useId();
  const source = data.source;
  const closedDates = data.dates.filter((_, index) => data.series.onStream[index] === 0);
  const liquidUnit = unitOf('liquidVolume', unitSystem);
  const gasUnit = unitOf('gasVolume', unitSystem);

  if (data.dates.length === 0) {
    return (
      <p className="well-sheet__notice">
        {section === 'production'
          ? messages.wellSheet.production.noData
          : messages.wellSheet.operation.noData}
      </p>
    );
  }

  const rates = [
    {
      name: messages.wellSheet.production.oil,
      color: CHART_COLORS.oil,
      values: convertSeries(data.series.oil, 'liquidVolume', unitSystem),
    },
    {
      name: messages.wellSheet.production.gas,
      color: CHART_COLORS.gas,
      values: convertSeries(data.series.gas, 'gasVolume', unitSystem),
      axis: 1,
    },
    {
      name: messages.wellSheet.production.water,
      color: CHART_COLORS.water,
      values: convertSeries(data.series.water, 'liquidVolume', unitSystem),
    },
  ];
  const waterCut = waterCutSeries(data);
  const gor = convertSeries(gorSeries(data), 'gasOilRatio', unitSystem);
  const cumulativeOil = convertSeries(cumulative(data.series.oil), 'liquidVolume', unitSystem);
  const cumulativeGas = convertSeries(cumulative(data.series.gas), 'gasVolume', unitSystem);
  const cumulativeWater = convertSeries(cumulative(data.series.water), 'liquidVolume', unitSystem);
  const injection = convertSeries(data.series.waterInj, 'liquidVolume', unitSystem);

  const operationSeries = [
    {
      title: messages.wellSheet.operation.pressures,
      series: [
        {
          name: messages.wellSheet.operation.bhp,
          color: CHART_COLORS.bhp,
          values: convertSeries(data.series.bhp, 'pressure', unitSystem),
        },
        {
          name: messages.wellSheet.operation.whp,
          color: CHART_COLORS.whp,
          values: convertSeries(data.series.whp, 'pressure', unitSystem),
        },
      ],
      axes: [{ name: unitOf('pressure', unitSystem) }],
      hasData: hasAny(data.series.bhp) || hasAny(data.series.whp),
    },
    {
      title: messages.wellSheet.operation.temperatures,
      series: [
        {
          name: messages.wellSheet.operation.bht,
          color: CHART_COLORS.bht,
          values: convertSeries(data.series.bht, 'temperature', unitSystem),
        },
        {
          name: messages.wellSheet.operation.wht,
          color: CHART_COLORS.wht,
          values: convertSeries(data.series.wht, 'temperature', unitSystem),
        },
      ],
      axes: [{ name: unitOf('temperature', unitSystem) }],
      hasData: hasAny(data.series.bht) || hasAny(data.series.wht),
    },
    {
      title: messages.wellSheet.operation.choke,
      series: [
        {
          name: messages.wellSheet.operation.chokeLabel,
          color: CHART_COLORS.choke,
          values: data.series.choke,
        },
      ],
      axes: [{ name: '%' }],
      hasData: hasAny(data.series.choke),
    },
    {
      title: messages.wellSheet.operation.onStream,
      series: [
        {
          name: messages.wellSheet.operation.onStreamLabel,
          color: CHART_COLORS.onStream,
          values: data.series.onStream,
        },
      ],
      axes: [{ name: 'h' }],
      hasData: hasAny(data.series.onStream),
    },
  ];

  return (
    <div className="production-charts">
      <p className="production-charts__hint">{messages.wellSheet.charts.zoomHint}</p>
      {section === 'production' ? (
        <>
          <SeriesChart
            title={messages.wellSheet.production.rates}
            dates={data.dates}
            series={rates}
            axes={[{ name: liquidUnit }, { name: gasUnit, position: 'right' }]}
            source={source}
            closedDates={closedDates}
            groupId={groupId}
          />
          {hasAny(waterCut) || hasAny(gor) ? (
            <SeriesChart
              title={messages.wellSheet.production.waterCutGor}
              dates={data.dates}
              series={[
                {
                  name: `${messages.wellSheet.production.waterCut} (%)`,
                  color: CHART_COLORS.water,
                  values: waterCut,
                },
                {
                  name: `${messages.wellSheet.production.gor} (${unitOf('gasOilRatio', unitSystem)})`,
                  color: CHART_COLORS.gas,
                  values: gor,
                  axis: 1,
                },
              ]}
              axes={[{ name: '%' }, { name: unitOf('gasOilRatio', unitSystem), position: 'right' }]}
              source={source}
              closedDates={closedDates}
              groupId={groupId}
            />
          ) : null}
          <SeriesChart
            title={messages.wellSheet.production.cumulative}
            dates={data.dates}
            series={[
              {
                name: messages.wellSheet.production.cumulativeOil,
                color: CHART_COLORS.cumulativeOil,
                values: cumulativeOil,
              },
              {
                name: messages.wellSheet.production.cumulativeGas,
                color: CHART_COLORS.cumulativeGas,
                values: cumulativeGas,
                axis: 1,
              },
              {
                name: messages.wellSheet.production.cumulativeWater,
                color: CHART_COLORS.cumulativeWater,
                values: cumulativeWater,
              },
            ]}
            axes={[{ name: liquidUnit }, { name: gasUnit, position: 'right' }]}
            source={source}
            closedDates={closedDates}
            groupId={groupId}
          />
          {hasAny(injection) ? (
            <SeriesChart
              title={messages.wellSheet.production.injection}
              dates={data.dates}
              series={[
                {
                  name: messages.wellSheet.production.waterInj,
                  color: CHART_COLORS.injection,
                  values: injection,
                },
              ]}
              axes={[{ name: liquidUnit }]}
              source={source}
              closedDates={closedDates}
              groupId={groupId}
            />
          ) : null}
        </>
      ) : (
        <>
          {operationSeries.map((chart) =>
            chart.hasData ? (
              <SeriesChart
                key={chart.title}
                title={chart.title}
                dates={data.dates}
                series={chart.series}
                axes={chart.axes}
                source={source}
                closedDates={closedDates}
                groupId={groupId}
              />
            ) : null,
          )}
          {!operationSeries.some((chart) => chart.hasData) && (
            <p className="well-sheet__notice">{messages.wellSheet.operation.noData}</p>
          )}
        </>
      )}
    </div>
  );
}
