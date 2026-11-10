import { describe, expect, it } from 'vitest';

import { parseCsv } from '../csv.ts';
import {
  normalizeFields,
  normalizeWells,
  parseSodirDate,
  type FieldOutlines,
} from './normalize.ts';

// Hand-written rows in Sodir's export format, with fictitious names. No third-party data.
const WELL_HEADER =
  'wlbWellboreName,wlbPurpose,wlbStatus,wlbEntryDate,wlbField,wlbTotalDepth,wlbNsDecDeg,wlbEwDecDeg';

const development = parseCsv(
  [
    WELL_HEADER,
    '99/1-A-1 H,PRODUCTION,PRODUCING,22.07.2011,TESTFELT,5927.0,56.931961,2.671294',
    '99/1-A-2 H,INJECTION,PRODUCING/INJECTING,01.02.2012,TESTFELT,4100.5,56.932,2.672',
    '99/1-A-3,OBSERVATION,CLOSED,,TESTFELT,,56.933,2.673',
    '99/1-A-4,NOT AVAILABLE,PLUGGED,31.02.2012,,-5,56.934,2.674',
    '99/1-A-5,PRODUCTION,WILL NEVER BE DRILLED,,TESTFELT,,56.935,2.675',
    '99/1-A-6,PRODUCTION,PRODUCING,01.01.2015,TESTFELT,3000,,',
    '99/1-A-7,PRODUCTION,PRODUCING,01.01.2015,TESTFELT,3000,156.9,2.6',
    '99/1-2,PRODUCTION,PRODUCING,05.06.2001,TESTFELT,3100,56.94,2.68',
  ].join('\r\n'),
).records;

const exploration = parseCsv(
  [
    WELL_HEADER,
    '99/1-1,WILDCAT,P&A,20.03.1989,,3574.0,56.887519,2.476583',
    '99/1-2,APPRAISAL,RE-CLASS TO DEV,01.05.2001,TESTFELT,3100,56.94,2.68',
    '99/1-3,WILDCAT,DRILLING,,,,56.95,2.69',
  ].join('\n'),
).records;

describe('parseSodirDate', () => {
  it('converts DD.MM.YYYY to ISO', () => {
    expect(parseSodirDate('20.03.1989')).toBe('1989-03-20');
  });

  it.each(['', '31.02.2012', '1989-03-20', 'n/a', undefined])('returns null for %j', (value) => {
    expect(parseSodirDate(value)).toBeNull();
  });
});

describe('normalizeWells', () => {
  const { wells, report } = normalizeWells(exploration, development);
  const byName = new Map(wells.map((well) => [well.name, well]));

  it('maps purpose and status to the domain enumerations', () => {
    expect(byName.get('99/1-A-1 H')).toMatchObject({
      wellType: 'producer',
      status: 'producing',
      spudDate: '2011-07-22',
      totalDepthM: 5927,
      latEd50Deg: 56.931961,
      lonEd50Deg: 2.671294,
      fieldName: 'TESTFELT',
    });
    expect(byName.get('99/1-A-2 H')).toMatchObject({ wellType: 'injector', status: 'injecting' });
    expect(byName.get('99/1-A-3')).toMatchObject({ wellType: 'observation', status: 'shut_in' });
    expect(byName.get('99/1-1')).toMatchObject({ wellType: 'exploration', status: 'abandoned' });
    expect(byName.get('99/1-3')).toMatchObject({ wellType: 'exploration', status: 'unknown' });
  });

  it('keeps missing or impossible values as null instead of inventing them', () => {
    expect(byName.get('99/1-A-3')).toMatchObject({ spudDate: null, totalDepthM: null });
    expect(byName.get('99/1-A-4')).toMatchObject({
      wellType: null,
      spudDate: null,
      totalDepthM: null,
      fieldName: null,
    });
  });

  it('prefers the development row of a reclassified wellbore', () => {
    expect(byName.get('99/1-2')).toMatchObject({ wellType: 'producer', spudDate: '2001-06-05' });
  });

  it('discards impossible rows and counts them by reason', () => {
    expect(report).toEqual({
      read: 11,
      kept: 7,
      discarded: {
        never_drilled: 1,
        missing_coordinates: 1,
        coordinates_out_of_range: 1,
        duplicate_name: 1,
      },
    });
  });
});

describe('normalizeFields', () => {
  const records = parseCsv(
    [
      'fldName,cmpLongName,fldCurrentActivitySatus,fldNpdidField',
      'TESTFELT,Demo Operator AS,Producing,1001',
      'STENGT,,Shut down,1002',
      'UKJENT,Demo Operator AS,,',
      ',Demo Operator AS,Producing,1004',
    ].join('\n'),
  ).records;
  const square: [number, number][][] = [
    [
      [2, 56],
      [3, 56],
      [3, 57],
      [2, 56],
    ],
  ];
  const outlines: FieldOutlines = {
    type: 'FeatureCollection',
    features: [
      { properties: { fldNpdidField: 1001 }, geometry: { type: 'Polygon', coordinates: square } },
      {
        properties: { fldNpdidField: 1001 },
        geometry: { type: 'MultiPolygon', coordinates: [square, square] },
      },
      { properties: { fldNpdidField: 1002 }, geometry: null },
    ],
  };
  const { fields, report } = normalizeFields(records, outlines);

  it('maps status and operator, and merges every outline part of a field', () => {
    expect(fields[0]).toMatchObject({
      name: 'TESTFELT',
      operator: 'Demo Operator AS',
      status: 'producing',
    });
    expect(fields[0]?.boundaryEd50).toHaveLength(3);
  });

  it('keeps a field without outline, operator or known status', () => {
    expect(fields[1]).toEqual({
      name: 'STENGT',
      operator: null,
      status: 'shut_down',
      boundaryEd50: null,
    });
    expect(fields[2]).toMatchObject({ name: 'UKJENT', status: 'unknown', boundaryEd50: null });
  });

  it('discards rows without a name', () => {
    expect(report).toEqual({ read: 4, kept: 3, discarded: { missing_name: 1 } });
  });
});
