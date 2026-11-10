'use client';

import type { WellProductionResponse } from '@petroatlas/shared-types';
import {
  beggsRobinson,
  composite,
  fetkovich,
  standing,
  standingBubblePoint,
  standingOilVolumeFactor,
  standingSolutionGas,
  vasquezBeggs,
  vasquezBeggsBubblePoint,
  vasquezBeggsOilVolumeFactor,
  vasquezBeggsSolutionGas,
  vogel,
  type IprPoint,
} from '@petroatlas/petro-calc';
import { useMemo, useState } from 'react';

import { messages } from '@/messages/es';

import { EngineeringChart } from './engineering-chart';

const PVT_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 4 });

const PRESSURE_POINTS = 20;

type IprModel = 'vogel' | 'fetkovich' | 'composite';

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function NumberField({ id, label, value, onChange }: NumberFieldProps) {
  return (
    <div className="engineering-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        step="any"
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
      />
    </div>
  );
}

function iprCurve(model: IprModel, values: Record<string, string>): IprPoint[] {
  const number = (key: string): number => Number(values[key]);
  if (model === 'vogel') {
    return vogel(number('pr'), { pwf: number('pwf'), q: number('q') }).curve;
  }
  if (model === 'fetkovich') {
    return fetkovich(number('pr'), [
      { pwf: number('pwf'), q: number('q') },
      { pwf: number('pwf2'), q: number('q2') },
    ]).curve;
  }
  return composite(number('pr'), number('pb'), number('j')).curve;
}

interface PvtInputs {
  api: number;
  gasGravity: number;
  temperatureF: number;
  solutionGasScfStb: number;
}

type PvtState =
  | {
      status: 'ready';
      standingResult: ReturnType<typeof standing>;
      vasquezResult: ReturnType<typeof vasquezBeggs>;
      pressures: number[];
      standingBo: (number | null)[];
      vasquezBo: (number | null)[];
      standingRs: (number | null)[];
      vasquezRs: (number | null)[];
      standingViscosity: (number | null)[];
      vasquezViscosity: (number | null)[];
    }
  | { status: 'error' };

function pvtState(input: PvtInputs): PvtState {
  try {
    const standingResult = standing(input);
    const vasquezResult = vasquezBeggs(input);
    const standingPb = standingBubblePoint(input);
    const vasquezPb = vasquezBeggsBubblePoint(input);
    const maximumPb = Math.max(standingPb, vasquezPb, 14.7);
    const pressures = Array.from(
      { length: PRESSURE_POINTS },
      (_, index) => 14.7 + ((maximumPb - 14.7) * index) / (PRESSURE_POINTS - 1),
    );

    const belowBubblePoint = (pressurePsia: number, bubblePointPsia: number): boolean =>
      pressurePsia <= bubblePointPsia + 1e-6;

    const series = (
      bubblePointPsia: number,
      solutionGas: (pressurePsia: number) => number | null,
      oilVolumeFactor: (solutionGasScfStb: number) => number,
      viscosity: (solutionGasScfStb: number) => number,
    ): { bo: (number | null)[]; rs: (number | null)[]; viscosity: (number | null)[] } => {
      const rs = pressures.map((pressurePsia) =>
        belowBubblePoint(pressurePsia, bubblePointPsia) ? solutionGas(pressurePsia) : null,
      );
      return {
        bo: rs.map((value) => (value === null ? null : oilVolumeFactor(value))),
        rs,
        viscosity: rs.map((value) => (value === null ? null : viscosity(value))),
      };
    };

    const standingSeries = series(
      standingPb,
      (pressurePsia) =>
        Math.min(
          standingSolutionGas({
            api: input.api,
            gasGravity: input.gasGravity,
            temperatureF: input.temperatureF,
            pressurePsia,
          }),
          input.solutionGasScfStb,
        ),
      (solutionGasScfStb) => standingOilVolumeFactor({ ...input, solutionGasScfStb }),
      (solutionGasScfStb) => beggsRobinson({ ...input, solutionGasScfStb }),
    );
    const vasquezSeries = series(
      vasquezPb,
      (pressurePsia) =>
        Math.min(
          vasquezBeggsSolutionGas({
            api: input.api,
            gasGravity: input.gasGravity,
            temperatureF: input.temperatureF,
            pressurePsia,
          }),
          input.solutionGasScfStb,
        ),
      (solutionGasScfStb) => vasquezBeggsOilVolumeFactor({ ...input, solutionGasScfStb }),
      (solutionGasScfStb) => beggsRobinson({ ...input, solutionGasScfStb }),
    );

    return {
      status: 'ready',
      standingResult,
      vasquezResult,
      pressures,
      standingBo: standingSeries.bo,
      vasquezBo: vasquezSeries.bo,
      standingRs: standingSeries.rs,
      vasquezRs: vasquezSeries.rs,
      standingViscosity: standingSeries.viscosity,
      vasquezViscosity: vasquezSeries.viscosity,
    };
  } catch {
    return { status: 'error' };
  }
}

export interface EngineeringTabProps {
  data: WellProductionResponse;
}

/** IPR and PVT calculators of the Engineering tab (RF-08). */
export function EngineeringTab({ data }: EngineeringTabProps) {
  const [model, setModel] = useState<IprModel>('vogel');
  const [values, setValues] = useState<Record<string, string>>({
    pr: '250',
    pwf: '180',
    q: '50',
    pwf2: '100',
    q2: '80',
    pb: '150',
    j: '0.5',
  });
  const [api, setApi] = useState('35');
  const [gasGravity, setGasGravity] = useState('0.75');
  const [temperature, setTemperature] = useState('200');
  const [solutionGas, setSolutionGas] = useState('600');

  const update = (key: string, value: string): void => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const ipr = useMemo((): IprPoint[] | null => {
    try {
      return iprCurve(model, values);
    } catch {
      return null;
    }
  }, [model, values]);

  const pvt = useMemo(
    () =>
      pvtState({
        api: Number(api),
        gasGravity: Number(gasGravity),
        temperatureF: Number(temperature),
        solutionGasScfStb: Number(solutionGas),
      }),
    [api, gasGravity, solutionGas, temperature],
  );

  const series = (standing: (number | null)[], vasquez: (number | null)[]) => [
    {
      name: messages.wellSheet.engineering.standing,
      color: '#1a7f4b',
      values: standing,
    },
    {
      name: messages.wellSheet.engineering.vasquez,
      color: '#c0392b',
      values: vasquez,
    },
  ];

  return (
    <div className="engineering-tabs">
      <section className="engineering-card">
        <h3>{messages.wellSheet.engineering.ipr}</h3>
        <div className="engineering-form">
          <div className="engineering-field">
            <label htmlFor="ipr-model">{messages.wellSheet.engineering.model}</label>
            <select
              id="ipr-model"
              value={model}
              onChange={(event) => {
                setModel(event.currentTarget.value as IprModel);
              }}
            >
              <option value="vogel">{messages.wellSheet.engineering.vogel}</option>
              <option value="fetkovich">{messages.wellSheet.engineering.fetkovich}</option>
              <option value="composite">{messages.wellSheet.engineering.composite}</option>
            </select>
          </div>
          <NumberField
            id="ipr-pr"
            label={messages.wellSheet.engineering.reservoirPressure}
            value={values.pr ?? ''}
            onChange={(value) => {
              update('pr', value);
            }}
          />
          {model === 'composite' ? (
            <>
              <NumberField
                id="ipr-pb"
                label={messages.wellSheet.engineering.bubblePoint}
                value={values.pb ?? ''}
                onChange={(value) => {
                  update('pb', value);
                }}
              />
              <NumberField
                id="ipr-j"
                label={messages.wellSheet.engineering.productivityIndex}
                value={values.j ?? ''}
                onChange={(value) => {
                  update('j', value);
                }}
              />
            </>
          ) : (
            <>
              <NumberField
                id="ipr-pwf"
                label={messages.wellSheet.engineering.flowingPressure}
                value={values.pwf ?? ''}
                onChange={(value) => {
                  update('pwf', value);
                }}
              />
              <NumberField
                id="ipr-q"
                label={messages.wellSheet.engineering.rate}
                value={values.q ?? ''}
                onChange={(value) => {
                  update('q', value);
                }}
              />
              {model === 'fetkovich' && (
                <>
                  <NumberField
                    id="ipr-pwf2"
                    label={messages.wellSheet.engineering.secondFlowingPressure}
                    value={values.pwf2 ?? ''}
                    onChange={(value) => {
                      update('pwf2', value);
                    }}
                  />
                  <NumberField
                    id="ipr-q2"
                    label={messages.wellSheet.engineering.secondRate}
                    value={values.q2 ?? ''}
                    onChange={(value) => {
                      update('q2', value);
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>
        {ipr === null ? (
          <p className="well-sheet__notice">{messages.wellSheet.engineering.inputError}</p>
        ) : (
          <EngineeringChart
            title={messages.wellSheet.engineering.iprChart}
            xType="value"
            xValues={ipr.map((point) => point.q)}
            series={[
              {
                name: 'q',
                color: '#1a7f4b',
                values: ipr.map((point) => point.pwf),
              },
            ]}
            axes={[{ name: 'Pwf (bar)' }]}
            source={data.source}
          />
        )}
      </section>

      <section className="engineering-card">
        <h3>{messages.wellSheet.engineering.pvt}</h3>
        <div className="engineering-form">
          <NumberField
            id="pvt-api"
            label={messages.wellSheet.engineering.api}
            value={api}
            onChange={setApi}
          />
          <NumberField
            id="pvt-gravity"
            label={messages.wellSheet.engineering.gasGravity}
            value={gasGravity}
            onChange={setGasGravity}
          />
          <NumberField
            id="pvt-temperature"
            label={messages.wellSheet.engineering.temperature}
            value={temperature}
            onChange={setTemperature}
          />
          <NumberField
            id="pvt-rs"
            label={messages.wellSheet.engineering.solutionGas}
            value={solutionGas}
            onChange={setSolutionGas}
          />
        </div>
        {pvt.status === 'error' ? (
          <p className="well-sheet__notice">{messages.wellSheet.engineering.inputError}</p>
        ) : (
          <>
            <table className="engineering-table">
              <caption>{messages.wellSheet.engineering.pvt}</caption>
              <thead>
                <tr>
                  <th scope="col">{messages.wellSheet.engineering.result}</th>
                  <th scope="col">{messages.wellSheet.engineering.standing}</th>
                  <th scope="col">{messages.wellSheet.engineering.vasquez}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{messages.wellSheet.engineering.bubble}</th>
                  <td>{PVT_FORMAT.format(pvt.standingResult.bubblePointPsia)} psia</td>
                  <td>{PVT_FORMAT.format(pvt.vasquezResult.bubblePointPsia)} psia</td>
                </tr>
                <tr>
                  <th scope="row">{messages.wellSheet.engineering.formationVolume}</th>
                  <td>{PVT_FORMAT.format(pvt.standingResult.oilFormationVolumeFactor)} bbl/STB</td>
                  <td>{PVT_FORMAT.format(pvt.vasquezResult.oilFormationVolumeFactor)} bbl/STB</td>
                </tr>
                <tr>
                  <th scope="row">{messages.wellSheet.engineering.viscosity}</th>
                  <td>{PVT_FORMAT.format(pvt.standingResult.oilViscosityCp)} cP</td>
                  <td>{PVT_FORMAT.format(pvt.vasquezResult.oilViscosityCp)} cP</td>
                </tr>
              </tbody>
            </table>
            <EngineeringChart
              title={messages.wellSheet.engineering.pvtBo}
              xType="value"
              xValues={pvt.pressures}
              series={series(pvt.standingBo, pvt.vasquezBo)}
              axes={[{ name: 'Bo (bbl/STB)' }]}
              source={data.source}
            />
            <EngineeringChart
              title={messages.wellSheet.engineering.pvtRs}
              xType="value"
              xValues={pvt.pressures}
              series={series(pvt.standingRs, pvt.vasquezRs)}
              axes={[{ name: 'Rs (scf/STB)' }]}
              source={data.source}
            />
            <EngineeringChart
              title={messages.wellSheet.engineering.pvtViscosity}
              xType="value"
              xValues={pvt.pressures}
              series={series(pvt.standingViscosity, pvt.vasquezViscosity)}
              axes={[{ name: 'μo (cP)' }]}
              source={data.source}
            />
          </>
        )}
      </section>
    </div>
  );
}
