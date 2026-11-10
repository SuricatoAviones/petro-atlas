import { describe, expect, it } from 'vitest';

import {
  excelSerialToIsoDate,
  normalizeMonthlyFieldProduction,
  normalizeProduction,
  normalizeTrajectories,
  normalizeWellName,
  toIsoDate,
  type RawTrajectory,
  type VolveRecord,
} from './normalize.ts';

const KNOWN = new Set(['15/9-F-12', '15/9-F-14']);

function productionRecord(overrides: VolveRecord = {}): VolveRecord {
  return {
    DATEPRD: new Date('2010-01-01T00:00:00Z'),
    NPD_WELL_BORE_NAME: '15/9-F-12',
    ON_STREAM_HRS: 24,
    AVG_DOWNHOLE_PRESSURE: 241.7,
    AVG_DOWNHOLE_TEMPERATURE: 106.1,
    AVG_WHP_P: 38.6,
    AVG_WHT_P: 84.3,
    AVG_CHOKE_SIZE_P: 52,
    BORE_OIL_VOL: 1520.4,
    BORE_GAS_VOL: 221300,
    BORE_WAT_VOL: 310.5,
    BORE_WI_VOL: null,
    ...overrides,
  };
}

describe('toIsoDate', () => {
  it('reads the Date objects returned by read-excel-file', () => {
    expect(toIsoDate(new Date('2014-04-07T00:00:00Z'))).toBe('2014-04-07');
  });

  it('converts an Excel serial date', () => {
    expect(excelSerialToIsoDate(41736)).toBe('2014-04-07');
  });

  it('rejects impossible dates and non-dates', () => {
    expect(toIsoDate('2012-02-30')).toBeNull();
    expect(toIsoDate('not a date')).toBeNull();
    expect(toIsoDate(null)).toBeNull();
  });
});

describe('normalizeWellName', () => {
  it('drops the WITSML NO prefix but keeps the official Sodir name', () => {
    expect(normalizeWellName('NO 15/9-F-12')).toBe('15/9-F-12');
    expect(normalizeWellName('15/9-F-1 C')).toBe('15/9-F-1 C');
    expect(normalizeWellName('   ')).toBeNull();
  });
});

describe('normalizeProduction', () => {
  it('keeps the daily values and converts an Excel date', () => {
    const { records, report } = normalizeProduction([productionRecord()], KNOWN);

    expect(report).toMatchObject({ read: 1, kept: 1, discarded: {} });
    expect(records[0]).toEqual({
      wellName: '15/9-F-12',
      date: '2010-01-01',
      oilSm3: 1520.4,
      gasSm3: 221300,
      waterSm3: 310.5,
      waterInjSm3: null,
      onStreamH: 24,
      bhpBar: 241.7,
      whpBar: 38.6,
      bhtC: 106.1,
      whtC: 84.3,
      chokePct: 52,
    });
  });

  it('discards rows for unknown wells and rows without a date', () => {
    const { records, report } = normalizeProduction(
      [
        productionRecord({ NPD_WELL_BORE_NAME: '99/9-UNKNOWN' }),
        productionRecord({ DATEPRD: null }),
      ],
      KNOWN,
    );

    expect(records).toHaveLength(0);
    expect(report.discarded).toMatchObject({ unknown_well: 1, missing_date: 1 });
  });

  it('drops impossible values without inventing zeros', () => {
    const { records, report } = normalizeProduction(
      [
        productionRecord({
          ON_STREAM_HRS: 25,
          BORE_OIL_VOL: -5,
          BORE_GAS_VOL: 10,
          BORE_WAT_VOL: 0,
        }),
      ],
      KNOWN,
    );

    expect(records[0]).toMatchObject({
      onStreamH: null,
      oilSm3: null,
      gasSm3: 10,
      waterSm3: 0,
    });
    expect(report.discarded).toMatchObject({
      on_stream_out_of_range: 1,
      negative_oil: 1,
    });
  });

  it('treats a zero pressure or temperature as a missing reading', () => {
    const { records, report } = normalizeProduction(
      [productionRecord({ AVG_DOWNHOLE_PRESSURE: 0, AVG_WHT_P: 0 })],
      KNOWN,
    );

    expect(records[0]).toMatchObject({ bhpBar: null, whtC: null });
    expect(report.discarded).toMatchObject({
      non_positive_pressure: 1,
      non_positive_temperature: 1,
    });
  });

  it('discards a row with no measurements at all', () => {
    const { records, report } = normalizeProduction(
      [
        productionRecord({
          ON_STREAM_HRS: null,
          AVG_DOWNHOLE_PRESSURE: null,
          AVG_DOWNHOLE_TEMPERATURE: null,
          AVG_WHP_P: null,
          AVG_WHT_P: null,
          AVG_CHOKE_SIZE_P: null,
          BORE_OIL_VOL: null,
          BORE_GAS_VOL: null,
          BORE_WAT_VOL: null,
          BORE_WI_VOL: null,
        }),
      ],
      KNOWN,
    );

    expect(records).toHaveLength(0);
    expect(report.discarded).toMatchObject({ no_measurements: 1 });
  });
});

describe('normalizeMonthlyFieldProduction', () => {
  it('sums the wells of the field into one monthly series', () => {
    const { records, report } = normalizeMonthlyFieldProduction(
      [
        {
          'Wellbore name': '15/9-F-12',
          Year: 2014,
          Month: 4,
          Oil: 100,
          Gas: 1000,
          Water: 10,
        },
        {
          'Wellbore name': '15/9-F-14',
          Year: 2014,
          Month: 4,
          Oil: 50,
          Gas: 500,
          Water: 5,
        },
        { 'Wellbore name': null, Year: null, Month: null, Oil: 'Sm3' },
      ],
      KNOWN,
    );

    expect(records).toEqual([{ month: '2014-04-01', oilSm3: 150, gasSm3: 1500, waterSm3: 15 }]);
    expect(report.discarded).toMatchObject({ missing_well: 1 });
  });
});

describe('normalizeTrajectories', () => {
  const oldTrajectory: RawTrajectory = {
    fileName: 'old.xml',
    wellName: 'NO 15/9-F-12',
    endDate: '2010-01-01T00:00:00Z',
    stations: [{ mdM: 0, tvdM: 0, inclDeg: 0, azimDeg: 0 }],
  };
  const latestTrajectory: RawTrajectory = {
    fileName: 'latest.xml',
    wellName: 'NO 15/9-F-12',
    endDate: '2016-01-01T00:00:00Z',
    stations: [
      { mdM: 0, tvdM: 0, inclDeg: 0, azimDeg: 0 },
      { mdM: 100, tvdM: 90, inclDeg: 10, azimDeg: 370 },
    ],
  };
  const unknownTrajectory: RawTrajectory = {
    fileName: 'unknown.xml',
    wellName: 'NO 99/9-1',
    endDate: '2016-01-01T00:00:00Z',
    stations: [{ mdM: 0, tvdM: 0, inclDeg: 0, azimDeg: 0 }],
  };

  it('picks the latest survey and normalizes the azimuth', () => {
    const { records, report } = normalizeTrajectories(
      [oldTrajectory, latestTrajectory, unknownTrajectory],
      KNOWN,
    );

    expect(records).toEqual([
      { wellName: '15/9-F-12', mdM: 0, tvdM: 0, inclDeg: 0, azimDeg: 0 },
      { wellName: '15/9-F-12', mdM: 100, tvdM: 90, inclDeg: 10, azimDeg: 10 },
    ]);
    expect(report).toMatchObject({
      read: 4,
      kept: 2,
      discarded: { duplicate_trajectory: 1, unknown_well: 1 },
    });
  });

  it('drops stations without a position', () => {
    const { records, report } = normalizeTrajectories(
      [
        {
          fileName: 'incomplete.xml',
          wellName: '15/9-F-12',
          endDate: null,
          stations: [
            { mdM: null, tvdM: 10, inclDeg: null, azimDeg: null },
            { mdM: 10, tvdM: 10, inclDeg: null, azimDeg: null },
          ],
        },
      ],
      KNOWN,
    );

    expect(records).toHaveLength(1);
    expect(report.discarded).toMatchObject({ missing_position: 1 });
  });
});
