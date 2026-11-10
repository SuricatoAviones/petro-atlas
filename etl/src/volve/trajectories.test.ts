import { describe, expect, it } from 'vitest';

import { parseTrajectoryFile, readMeasurement } from './trajectories.ts';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<trajectorys xmlns="http://www.witsml.org/schemas/1series" version="1.4.1.1">
  <trajectory uid="A">
    <nameWell>NO 15/9-F-12</nameWell>
    <nameWellbore>NO 15/9-F-12</nameWellbore>
    <dTimTrajEnd>2016-08-14T16:47:53.000Z</dTimTrajEnd>
    <trajectoryStation uid="A_TIE_POINT">
      <md uom="m">0</md>
      <tvd uom="m">0</tvd>
      <incl uom="rad">0</incl>
      <azi uom="rad">0</azi>
    </trajectoryStation>
    <trajectoryStation uid="A_2">
      <md uom="ft">100</md>
      <tvd uom="ft">95</tvd>
      <incl uom="deg">10</incl>
      <azi uom="deg">45</azi>
    </trajectoryStation>
  </trajectory>
</trajectorys>`;

describe('readMeasurement', () => {
  it('converts feet to metres', () => {
    expect(readMeasurement({ '#text': 100, '@_uom': 'ft' }, 'length')).toBeCloseTo(30.48, 10);
  });

  it('converts radians to degrees', () => {
    expect(readMeasurement({ '#text': Math.PI, '@_uom': 'rad' }, 'angle')).toBeCloseTo(180, 10);
  });

  it('returns null for a length with an unknown unit', () => {
    expect(readMeasurement({ '#text': 10, '@_uom': 'furlong' }, 'length')).toBeNull();
  });
});

describe('parseTrajectoryFile', () => {
  it('reads the well, the end date and the stations', () => {
    const [trajectory] = parseTrajectoryFile('test.xml', XML);

    expect(trajectory).toMatchObject({
      fileName: 'test.xml',
      wellName: 'NO 15/9-F-12',
      endDate: '2016-08-14T16:47:53.000Z',
    });
    expect(trajectory?.stations).toHaveLength(2);
    const station = trajectory?.stations[1];
    expect(station?.mdM).toBeCloseTo(30.48, 10);
    expect(station?.tvdM).toBeCloseTo(28.956, 10);
    expect(station?.inclDeg).toBeCloseTo(10, 10);
    expect(station?.azimDeg).toBeCloseTo(45, 10);
  });

  it('fails with the file name when the document has no trajectory', () => {
    expect(() => parseTrajectoryFile('empty.xml', '<trajectorys></trajectorys>')).toThrow(
      'empty.xml has no trajectory elements',
    );
  });
});
