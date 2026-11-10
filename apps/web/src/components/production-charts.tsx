'use client';

import type { WellProductionResponse } from '@petroatlas/shared-types';
import { fitArps, rateAt } from '@petroatlas/petro-calc';
import { useMemo } from 'react';

import { messages } from '@/messages/es';

import type { FitWindow, UnitSystem } from '@/lib/sheet-state';

import { CHART_COLORS } from './chart-colors';
import { SeriesChart, convertSeries, unitOf, type ChartSeries } from './series-chart';

const NUMBER_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

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

function daysBetween(startDate: string, endDate: string): number {
  return Math.round(
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000,
  );
}

interface FitResult {
  status: 'ready' | 'error';
  qi: number;
  di: number;
  b: number;
  r2: number;
  values: (number | null)[];
}

function fitWindowResult(
  data: WellProductionResponse,
  window: FitWindow,
  unitSystem: UnitSystem,
): FitResult {
  const oil = convertSeries(data.series.oil, 'liquidVolume', unitSystem);
  const t: number[] = [];
  const q: number[] = [];
  data.dates.forEach((date, index) => {
    if (date < window.start || date > window.end) return;
    const value = oil[index] ?? null;
    if (value !== null && value > 0) {
      t.push(daysBetween(window.start, date));
      q.push(value);
    }
  });
  try {
    const fit = fitArps(t, q);
    const values = data.dates.map((date) => {
      if (date < window.start || date > window.end) return null;
      return rateAt(fit, daysBetween(window.start, date));
    });
    return { status: 'ready', qi: fit.qi, di: fit.di, b: fit.b, r2: fit.r2, values };
  } catch {
    return { status: 'error', qi: 0, di: 0, b: 0, r2: 0, values: [] };
  }
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
  fitWindow: FitWindow | null;
  onFitWindowChange: (fitWindow: FitWindow | null) => void;
  /** Shared by every time chart of the sheet, so zoom and cursor stay in sync (docs/07). */
  groupId: string;
}

/** Charts of the Production and Operation tabs (docs/07). All charts share a time zoom. */
export function ProductionCharts({
  data,
  unitSystem,
  section,
  fitWindow,
  onFitWindowChange,
  groupId,
}: ProductionChartsProps) {
  const source = data.source;
  const closedDates = data.dates.filter((_, index) => data.series.onStream[index] === 0);
  const liquidUnit = unitOf('liquidVolume', unitSystem);
  const gasUnit = unitOf('gasVolume', unitSystem);
  const fit = useMemo(
    () => (fitWindow === null ? null : fitWindowResult(data, fitWindow, unitSystem)),
    [data, fitWindow, unitSystem],
  );

  if (data.dates.length === 0) {
    return (
      <p className="well-sheet__notice">
        {section === 'production'
          ? messages.wellSheet.production.noData
          : messages.wellSheet.operation.noData}
      </p>
    );
  }

  const rates: ChartSeries[] = [
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
  if (fit?.status === 'ready') {
    rates.push({
      name: messages.wellSheet.fit.title,
      color: '#7a4fa3',
      values: fit.values,
      lineType: 'dashed',
    });
  }
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
            onSelectVisibleRange={(start, end) => {
              onFitWindowChange({ start, end });
            }}
          />
          {fit !== null && (
            <section className="fit-summary">
              <div className="chart-card__header">
                <h4>{messages.wellSheet.fit.title}</h4>
                <button
                  type="button"
                  className="chart-card__action"
                  onClick={() => {
                    onFitWindowChange(null);
                  }}
                >
                  {messages.wellSheet.fit.clear}
                </button>
              </div>
              {fit.status === 'error' ? (
                <p className="well-sheet__notice">{messages.wellSheet.fit.noFit}</p>
              ) : (
                <>
                  <p>
                    {messages.wellSheet.fit.window}: {fitWindow?.start} – {fitWindow?.end}
                  </p>
                  <dl>
                    <dt>{messages.wellSheet.fit.qi}</dt>
                    <dd>
                      {NUMBER_FORMAT.format(fit.qi)} {liquidUnit}/d
                    </dd>
                    <dt>{messages.wellSheet.fit.di}</dt>
                    <dd>{NUMBER_FORMAT.format(fit.di)} 1/d</dd>
                    <dt>{messages.wellSheet.fit.b}</dt>
                    <dd>{NUMBER_FORMAT.format(fit.b)}</dd>
                    <dt>{messages.wellSheet.fit.r2}</dt>
                    <dd>{NUMBER_FORMAT.format(fit.r2)}</dd>
                  </dl>
                  <p className="fit-summary__note">{messages.wellSheet.fit.loadedFrom}</p>
                </>
              )}
            </section>
          )}
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
