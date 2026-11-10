/** WITSML trajectory files from the Volve dataset, parsed into plain survey values. */
import { readFile, readdir } from 'node:fs/promises';

import { XMLParser } from 'fast-xml-parser';

import type { RawTrajectory, RawTrajectoryStation } from './normalize.ts';

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'trajectory' || name === 'trajectoryStation',
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function scalar(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

type MeasurementKind = 'length' | 'angle';

/** Reads a WITSML measurement (`<md uom="m">145.9</md>`) and converts it to m or degrees. */
export function readMeasurement(value: unknown, kind: MeasurementKind): number | null {
  const record = asRecord(value);
  const rawValue = record === null ? value : record['#text'];
  const uomValue = record?.['@_uom'];
  const uom = typeof uomValue === 'string' ? uomValue.trim().toLowerCase() : null;
  const number = scalar(rawValue);
  if (number === null) return null;

  if (kind === 'length') {
    if (uom === null || uom === 'm' || uom === 'meter' || uom === 'metre') return number;
    if (uom === 'ft' || uom === 'feet' || uom === 'foot') return number * 0.3048;
    if (uom === 'mm') return number / 1000;
    return null;
  }

  if (uom === null || uom === 'rad' || uom === 'radian') return (number * 180) / Math.PI;
  if (uom === 'deg' || uom === 'degree' || uom === '°') return number;
  return null;
}

function parseStation(value: unknown): RawTrajectoryStation | null {
  const record = asRecord(value);
  if (record === null) return null;
  return {
    mdM: readMeasurement(record.md, 'length'),
    tvdM: readMeasurement(record.tvd, 'length'),
    inclDeg: readMeasurement(record.incl, 'angle'),
    azimDeg: readMeasurement(record.azi, 'angle'),
  };
}

/** Parses the `trajectorys` document returned by the Volve WITSML files. */
export function parseTrajectoryFile(fileName: string, xml: string): RawTrajectory[] {
  const document = asRecord(parser.parse(xml));
  const root = asRecord(document?.trajectorys);
  const trajectories = root?.trajectory;
  if (!Array.isArray(trajectories)) {
    throw new Error(`${fileName} has no trajectory elements`);
  }

  return trajectories.flatMap((value) => {
    const trajectory = asRecord(value);
    if (trajectory === null) return [];
    const stations = Array.isArray(trajectory.trajectoryStation)
      ? trajectory.trajectoryStation.flatMap((station) => {
          const parsed = parseStation(station);
          return parsed === null ? [] : [parsed];
        })
      : [];
    return [
      {
        fileName,
        wellName: text(trajectory.nameWellbore) ?? text(trajectory.nameWell),
        endDate: text(trajectory.dTimTrajEnd),
        stations,
      },
    ];
  });
}

export async function readTrajectories(directory: URL): Promise<RawTrajectory[]> {
  const names = (await readdir(directory))
    .filter((name) => name.toLowerCase().endsWith('.xml'))
    .sort((left, right) => left.localeCompare(right));

  const trajectories: RawTrajectory[] = [];
  for (const name of names) {
    trajectories.push(
      ...parseTrajectoryFile(name, await readFile(new URL(name, directory), 'utf8')),
    );
  }
  return trajectories;
}
