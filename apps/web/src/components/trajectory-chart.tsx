'use client';

import type { WellTrajectoryResponse } from '@petroatlas/shared-types';
import { toField } from '@suricatoaviones/petro-calc';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef } from 'react';

import type { TableData } from '@/lib/export';
import type { UnitSystem } from '@/lib/sheet-state';

import { ChartSource, ChartTools, PNG_EXPORT_OPTIONS } from './chart-tools';
import { useMessages } from './locale-provider';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

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
  const messages = useMessages();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const unit = unitSystem === 'si' ? 'm' : 'ft';
  const points = useMemo(() => stationPoints(data), [data]);
  const chartData = points.map((point) => [
    lengthValue(point.horizontalM, unitSystem),
    lengthValue(point.tvdM, unitSystem),
  ]);
  const table = useMemo(
    (): TableData => ({
      headers: [
        `${messages.wellSheet.trajectory.measuredDepth} (${unit})`,
        `${messages.wellSheet.trajectory.depth} (${unit})`,
        `${messages.wellSheet.trajectory.displacement} (${unit})`,
        messages.wellSheet.trajectory.inclination,
        messages.wellSheet.trajectory.azimuth,
      ],
      rows: points.map((point) => [
        lengthValue(point.mdM, unitSystem),
        lengthValue(point.tvdM, unitSystem),
        lengthValue(point.horizontalM, unitSystem),
        point.inclDeg,
        point.azimDeg,
      ]),
    }),
    [messages, points, unit, unitSystem],
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
  }, [chartData, messages, unit]);

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
      <ChartSource source={data.source} />
      <ChartTools
        title={messages.wellSheet.trajectory.title}
        table={table}
        getImage={() => chartRef.current?.getDataURL(PNG_EXPORT_OPTIONS) ?? null}
      />
    </section>
  );
}
