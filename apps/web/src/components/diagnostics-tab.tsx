'use client';

import type { WellProductionResponse } from '@petroatlas/shared-types';
import { chan, productivityIndex } from '@petroatlas/petro-calc';
import { useMemo, useState } from 'react';

import { messages } from '@/messages/es';

import { EngineeringChart } from './engineering-chart';

function cumulativeOil(data: WellProductionResponse): (number | null)[] {
  let total = 0;
  return data.series.oil.map((value) => {
    if (value === null) return null;
    total += value;
    return total;
  });
}

function positiveOrNull(value: number | null): number | null {
  return value !== null && value > 0 ? value : null;
}

export interface DiagnosticsTabProps {
  data: WellProductionResponse;
}

/** Chan, rate versus cumulative and productivity index (RF-09). */
export function DiagnosticsTab({ data }: DiagnosticsTabProps) {
  const [reservoirPressure, setReservoirPressure] = useState('250');
  const hasOil = data.series.oil.some((value) => value !== null);
  const hasWater = data.series.water.some((value) => value !== null);
  const hasBhp = data.series.bhp.some((value) => value !== null);
  const pressure = Number(reservoirPressure);
  const validPressure = Number.isFinite(pressure) && pressure > 0;

  const diagnostic = useMemo(() => chan(data.series.water, data.series.oil), [data]);
  const cumulative = useMemo(() => cumulativeOil(data), [data]);
  const elapsedDays = data.dates.map((_, index) => index + 1);
  const ratePoints = data.series.oil.flatMap((rate, index) => {
    const np = cumulative[index];
    return rate === null || np === null || np === undefined || rate <= 0 ? [] : [{ np, rate }];
  });
  const productivity = useMemo(
    () =>
      validPressure
        ? data.series.oil.map((rate, index) =>
            productivityIndex(rate, pressure, data.series.bhp[index] ?? null),
          )
        : data.series.oil.map(() => null),
    [data, pressure, validPressure],
  );

  if (!hasOil) {
    return <p className="well-sheet__notice">{messages.wellSheet.diagnostics.noData}</p>;
  }

  return (
    <div className="engineering-tabs">
      {hasWater ? (
        <>
          <EngineeringChart
            title={messages.wellSheet.diagnostics.chan}
            xType="value"
            xValues={elapsedDays}
            series={[
              {
                name: 'RAP',
                color: '#1f6fb2',
                values: diagnostic.wor.map(positiveOrNull),
              },
            ]}
            axes={[{ name: 'RAP (Sm³/Sm³)' }]}
            source={data.source}
            logX
            logY
          />
          <EngineeringChart
            title={messages.wellSheet.diagnostics.chanDerivative}
            xType="value"
            xValues={elapsedDays}
            series={[
              {
                name: "RAP'",
                color: '#7a4fa3',
                values: diagnostic.derivative.map(positiveOrNull),
              },
            ]}
            axes={[{ name: 'RAP′ (1/d)' }]}
            source={data.source}
            note={messages.wellSheet.diagnostics.positiveOnly}
            logX
            logY
          />
        </>
      ) : (
        <section className="engineering-card">
          <h3>{messages.wellSheet.diagnostics.chan}</h3>
          <p className="well-sheet__notice">{messages.wellSheet.diagnostics.noWater}</p>
        </section>
      )}

      <EngineeringChart
        title={messages.wellSheet.diagnostics.rateVsCumulative}
        xType="value"
        xValues={ratePoints.map((point) => point.np)}
        series={[
          {
            name: 'qo',
            color: '#1a7f4b',
            values: ratePoints.map((point) => point.rate),
          },
        ]}
        axes={[{ name: 'qo (Sm³/d)' }]}
        source={data.source}
      />

      <section className="engineering-card">
        <h3>{messages.wellSheet.diagnostics.productivityIndex}</h3>
        <div className="engineering-form">
          <div className="engineering-field">
            <label htmlFor="diagnostics-pr">
              {messages.wellSheet.diagnostics.reservoirPressure}
            </label>
            <input
              id="diagnostics-pr"
              type="number"
              step="any"
              value={reservoirPressure}
              onChange={(event) => {
                setReservoirPressure(event.currentTarget.value);
              }}
            />
          </div>
        </div>
        {!validPressure ? (
          <p className="well-sheet__notice well-sheet__notice--error" role="alert">
            {messages.wellSheet.diagnostics.pressureError}
          </p>
        ) : hasBhp ? (
          <EngineeringChart
            title={messages.wellSheet.diagnostics.productivityIndex}
            xType="time"
            xValues={data.dates}
            series={[
              {
                name: 'J',
                color: '#8a6410',
                values: productivity,
              },
            ]}
            axes={[{ name: 'J (Sm³/d/bar)' }]}
            source={data.source}
          />
        ) : (
          <p className="well-sheet__notice">{messages.wellSheet.diagnostics.noPressure}</p>
        )}
      </section>
    </div>
  );
}
