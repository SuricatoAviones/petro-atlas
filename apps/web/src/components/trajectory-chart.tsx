'use client';

import type { WellTrajectoryResponse } from '@petroatlas/shared-types';
import { toField } from '@petroatlas/petro-calc';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useRef, useState } from 'react';

import { messages } from '@/messages/es';
import type { UnitSystem } from '@/lib/sheet-state';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const NUMBER_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

interface StationPoint {
  mdM: number;
  tvdM: number;
  horizontalM: number;
  inclDeg: number | null;
  azimDeg: number | null;
}

function stationPoints(data: WellTrajectoryResponse): StationPoint[] {
  let horizontalM = 0;
  let previousMd = 0;
  let previousTvd = 0;
  return data.stations.map((station, index) => {
    if (index > 0) {
      const deltaMd = station.mdM - previousMd;
      const deltaTvd = station.tvdM - previousTvd;
      horizontalM += Math.sqrt(Math.max(0, deltaMd ** 2 - deltaTvd ** 2));
    }
    previousMd = station.mdM;
    previousTvd = station.tvdM;
    return {
      mdM: station.mdM,
      tvdM: station.tvdM,
      horizontalM,
      inclDeg: station.inclDeg,
      azimDeg: station.azimDeg,
    };
  });
}

function lengthValue(valueM: number, unitSystem: UnitSystem): number {
  return unitSystem === 'si' ? valueM : toField(valueM, 'length');
}

export interface TrajectoryChartProps {
  data: WellTrajectoryResponse;
  unitSystem: UnitSystem;
}

/** Vertical section of the well (docs/07, "Trayectoria"). */
export function TrajectoryChart({ data, unitSystem }: TrajectoryChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const [showTable, setShowTable] = useState(false);
  const unit = unitSystem === 'si' ? 'm' : 'ft';
  const points = stationPoints(data);
  const chartData = points.map((point) => [
    lengthValue(point.horizontalM, unitSystem),
    lengthValue(point.tvdM, unitSystem),
  ]);

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
    chartRef.current?.setOption(
      {
        animation: false,
        tooltip: { trigger: 'axis' },
        grid: { left: 56, right: 24, top: 36, bottom: 32 },
        xAxis: {
          type: 'value',
          name: `${messages.wellSheet.trajectory.displacement} (${unit})`,
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
        },
        yAxis: {
          type: 'value',
          inverse: true,
          name: `${messages.wellSheet.trajectory.depth} (${unit})`,
          nameTextStyle: { fontSize: 10 },
          axisLabel: { fontSize: 10 },
        },
        series: [
          {
            type: 'line',
            name: messages.wellSheet.trajectory.title,
            data: chartData,
            showSymbol: false,
            lineStyle: { width: 2, color: '#12303a' },
            itemStyle: { color: '#12303a' },
          },
        ],
      } satisfies echarts.EChartsCoreOption,
      true,
    );
  }, [chartData, unit]);

  if (data.stations.length === 0) {
    return <p className="well-sheet__notice">{messages.wellSheet.trajectory.noData}</p>;
  }

  return (
    <section className="chart-card">
      <h4>{messages.wellSheet.trajectory.title}</h4>
      <div
        ref={containerRef}
        className="chart-card__canvas"
        role="img"
        aria-label={messages.wellSheet.trajectory.title}
      />
      <p className="chart-card__source">
        {messages.wellSheet.charts.source}:{' '}
        <a href={data.source.url} target="_blank" rel="noreferrer">
          {data.source.name}
        </a>{' '}
        · {data.source.license}
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
                <th scope="col">{messages.wellSheet.trajectory.measuredDepth}</th>
                <th scope="col">{messages.wellSheet.trajectory.depth}</th>
                <th scope="col">{messages.wellSheet.trajectory.displacement}</th>
                <th scope="col">{messages.wellSheet.trajectory.inclination}</th>
                <th scope="col">{messages.wellSheet.trajectory.azimuth}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.mdM}>
                  <td>{NUMBER_FORMAT.format(lengthValue(point.mdM, unitSystem))}</td>
                  <td>{NUMBER_FORMAT.format(lengthValue(point.tvdM, unitSystem))}</td>
                  <td>{NUMBER_FORMAT.format(lengthValue(point.horizontalM, unitSystem))}</td>
                  <td>{point.inclDeg === null ? '—' : NUMBER_FORMAT.format(point.inclDeg)}</td>
                  <td>{point.azimDeg === null ? '—' : NUMBER_FORMAT.format(point.azimDeg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
