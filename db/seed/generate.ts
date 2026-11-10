/**
 * Deterministic generator of a synthetic field for development and tests (docs/10, "Reglas de
 * licencia": db/seed contains only generated data).
 *
 * Every name is clearly fictitious and the field sits in open water of the Norwegian Sea, away
 * from any real field. Values follow plausible trends (hyperbolic decline, rising water cut,
 * depleting pressure) but are not measurements of anything.
 *
 * Volumes are daily volumes in Sm³, as `production_daily` stores them (docs/05).
 */

export type WellType = 'producer' | 'injector' | 'exploration' | 'observation';
export type WellStatus = 'producing' | 'injecting' | 'shut_in' | 'abandoned' | 'unknown';

export interface SyntheticSource {
  name: string;
  license: string;
  url: string;
}

export interface SyntheticField {
  name: string;
  operator: string;
  status: 'producing';
  /** Closed ring of [lon, lat] pairs in EPSG:4326. */
  boundary: [number, number][];
}

export interface SyntheticWell {
  name: string;
  wellType: WellType;
  status: WellStatus;
  /** ISO date, YYYY-MM-DD. */
  spudDate: string;
  totalDepthM: number;
  lon: number;
  lat: number;
}

export interface DailyProductionRow {
  wellName: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  oilSm3: number | null;
  gasSm3: number | null;
  waterSm3: number | null;
  waterInjSm3: number | null;
  onStreamH: number | null;
  bhpBar: number | null;
  whpBar: number | null;
  bhtC: number | null;
  whtC: number | null;
  chokePct: number | null;
}

export interface SyntheticTrajectoryStation {
  wellName: string;
  mdM: number;
  tvdM: number;
  inclDeg: number | null;
  azimDeg: number | null;
}

/**
 * A log curve sampled at a constant depth step between `topM` and `baseM` (docs/05). A sample
 * the tool did not record is `null`.
 */
export interface SyntheticLogCurve {
  wellName: string;
  mnemonic: string;
  unit: string;
  topM: number;
  baseM: number;
  samples: (number | null)[];
}

export interface SyntheticFieldProductionMonth {
  /** First day of the month, YYYY-MM-01. */
  month: string;
  oilSm3: number;
  gasSm3: number;
  waterSm3: number;
}

export interface SyntheticDataset {
  source: SyntheticSource;
  field: SyntheticField;
  wells: SyntheticWell[];
  production: DailyProductionRow[];
  fieldProduction: SyntheticFieldProductionMonth[];
  trajectories: SyntheticTrajectoryStation[];
  logs: SyntheticLogCurve[];
}

const RANDOM_SEED = 20_250_101;
export const PRODUCTION_START_DATE = '2025-01-01';
export const PRODUCTION_DAYS = 365;

const FIELD_BOUNDS = { minLon: 2.9, maxLon: 3.1, minLat: 64.55, maxLat: 64.65 };
const PRODUCER_COUNT = 14;
const INJECTOR_COUNT = 4;
const SHUT_IN_PRODUCER_INDEX = 13;
const SHUT_IN_FROM_DAY = 250;
const GAUGE_OUTAGE_FROM_DAY = 120;

/** Mulberry32: a small seeded PRNG, so every run produces the same dataset. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function wellName(index: number): string {
  return `SYN-A-${String(index + 1).padStart(2, '0')}`;
}

function generateWells(random: () => number): SyntheticWell[] {
  const wellCount = PRODUCER_COUNT + INJECTOR_COUNT + 2;
  const columns = 5;
  const rows = Math.ceil(wellCount / columns);
  const lonStep = (FIELD_BOUNDS.maxLon - FIELD_BOUNDS.minLon) / (columns + 1);
  const latStep = (FIELD_BOUNDS.maxLat - FIELD_BOUNDS.minLat) / (rows + 1);

  return Array.from({ length: wellCount }, (_, index) => {
    const isProducer = index < PRODUCER_COUNT;
    const isInjector = !isProducer && index < PRODUCER_COUNT + INJECTOR_COUNT;
    const isObservation = index === wellCount - 2;

    let wellType: WellType = 'exploration';
    let status: WellStatus = 'abandoned';
    if (isProducer) {
      wellType = 'producer';
      status = index === SHUT_IN_PRODUCER_INDEX ? 'shut_in' : 'producing';
    } else if (isInjector) {
      wellType = 'injector';
      status = 'injecting';
    } else if (isObservation) {
      wellType = 'observation';
      status = 'unknown';
    }

    // Grid position with a small jitter, always inside the field boundary.
    const column = index % columns;
    const row = Math.floor(index / columns);
    const lon = FIELD_BOUNDS.minLon + lonStep * (column + 1) + (random() - 0.5) * lonStep * 0.5;
    const lat = FIELD_BOUNDS.minLat + latStep * (row + 1) + (random() - 0.5) * latStep * 0.5;

    const spudDate = addDays('2018-03-01', Math.floor(random() * 365 * 5));
    const totalDepthM = round(2_800 + random() * (wellType === 'exploration' ? 2_000 : 1_400), 0);

    return {
      name: wellName(index),
      wellType,
      status,
      spudDate,
      totalDepthM,
      lon: round(lon, 5),
      lat: round(lat, 5),
    };
  });
}

/** Hours on stream for each day: mostly 24, a short maintenance stop and a few partial days. */
function generateOnStreamHours(random: () => number): number[] {
  const maintenanceStart = 30 + Math.floor(random() * 300);
  const maintenanceDays = 2 + Math.floor(random() * 3);
  return Array.from({ length: PRODUCTION_DAYS }, (_, day) => {
    if (day >= maintenanceStart && day < maintenanceStart + maintenanceDays) return 0;
    const draw = random();
    if (draw < 0.01) return 0;
    if (draw < 0.06) return round(8 + random() * 15);
    return 24;
  });
}

/** Choke opening that changes in steps every two to four months. */
function generateChokePct(random: () => number): number[] {
  const chokePct: number[] = [];
  let currentPct = 30 + random() * 50;
  let nextChange = 60 + Math.floor(random() * 60);
  for (let day = 0; day < PRODUCTION_DAYS; day += 1) {
    if (day === nextChange) {
      currentPct = Math.min(100, Math.max(20, currentPct + (random() - 0.4) * 20));
      nextChange += 60 + Math.floor(random() * 60);
    }
    chokePct.push(round(currentPct));
  }
  return chokePct;
}

function noise(random: () => number, relativeAmplitude: number): number {
  return 1 + (random() * 2 - 1) * relativeAmplitude;
}

function generateProducerRows(
  well: SyntheticWell,
  wellIndex: number,
  random: () => number,
): DailyProductionRow[] {
  const qiOilSm3PerDay = 120 + random() * 530;
  const diPerDay = 0.0008 + random() * 0.0017;
  const b = 0.3 + random() * 0.6;
  const waterCutStart = 0.02 + random() * 0.33;
  const waterCutRise = 0.05 + random() * 0.35;
  const gorStartSm3PerSm3 = 120 + random() * 140;
  const gorRise = random() * 0.25;
  const reservoirPressureStartBar = 200 + random() * 90;
  const pressureDeclineBarPerYear = 8 + random() * 22;
  const drawdownBar = 25 + random() * 35;
  const bhtBaseC = 95 + random() * 23;
  const whtFlowingC = 55 + random() * 25;
  const hasDownholeGauge = wellIndex % 4 !== 3;
  // One well loses its downhole gauge for 20 days, a gap the charts must show as a gap.
  const gaugeOutageDays =
    wellIndex === 1 ? { from: GAUGE_OUTAGE_FROM_DAY, to: GAUGE_OUTAGE_FROM_DAY + 20 } : null;

  const onStreamHours = generateOnStreamHours(random);
  const chokePct = generateChokePct(random);

  return Array.from({ length: PRODUCTION_DAYS }, (_, day) => {
    const isShutInForGood = wellIndex === SHUT_IN_PRODUCER_INDEX && day >= SHUT_IN_FROM_DAY;
    const onStreamH = isShutInForGood ? 0 : (onStreamHours[day] ?? 24);
    const isFlowing = onStreamH > 0;
    const yearFraction = day / PRODUCTION_DAYS;

    const oilPotentialSm3 = qiOilSm3PerDay / (1 + b * diPerDay * day) ** (1 / b);
    const oilSm3 = isFlowing ? oilPotentialSm3 * (onStreamH / 24) * noise(random, 0.04) : 0;
    const waterCut = Math.min(0.95, waterCutStart + waterCutRise * yearFraction);
    const waterSm3 = (oilSm3 * waterCut) / (1 - waterCut);
    const gasSm3 = oilSm3 * gorStartSm3PerSm3 * (1 + gorRise * yearFraction) * noise(random, 0.03);

    const reservoirPressureBar =
      reservoirPressureStartBar - pressureDeclineBarPerYear * yearFraction;
    const bhpBar = isFlowing ? reservoirPressureBar - drawdownBar : reservoirPressureBar - 3;
    const whpBar = bhpBar * (isFlowing ? 0.14 : 0.2) * noise(random, 0.02);
    const isGaugeOut =
      gaugeOutageDays !== null && day >= gaugeOutageDays.from && day < gaugeOutageDays.to;
    const gaugeReads = hasDownholeGauge && !isGaugeOut;

    return {
      wellName: well.name,
      date: addDays(PRODUCTION_START_DATE, day),
      oilSm3: round(oilSm3),
      gasSm3: round(gasSm3, 0),
      waterSm3: round(waterSm3),
      waterInjSm3: null,
      onStreamH,
      bhpBar: gaugeReads ? round(bhpBar + (random() - 0.5) * 1.6) : null,
      whpBar: round(whpBar),
      bhtC: gaugeReads ? round(bhtBaseC + (random() - 0.5) * 0.6) : null,
      whtC: round(isFlowing ? whtFlowingC + (random() - 0.5) * 2 : 18 + random() * 4),
      chokePct: isFlowing ? (chokePct[day] ?? null) : 0,
    };
  });
}

function generateInjectorRows(well: SyntheticWell, random: () => number): DailyProductionRow[] {
  const injectionSm3PerDay = 900 + random() * 1_500;
  const bhpStartBar = 300 + random() * 60;
  const onStreamHours = generateOnStreamHours(random);

  return Array.from({ length: PRODUCTION_DAYS }, (_, day) => {
    const onStreamH = onStreamHours[day] ?? 24;
    const isInjecting = onStreamH > 0;
    const bhpBar = bhpStartBar - 6 * (day / PRODUCTION_DAYS) - (isInjecting ? 0 : 40);
    return {
      wellName: well.name,
      date: addDays(PRODUCTION_START_DATE, day),
      oilSm3: null,
      gasSm3: null,
      waterSm3: null,
      waterInjSm3: round(
        isInjecting ? injectionSm3PerDay * (onStreamH / 24) * noise(random, 0.05) : 0,
      ),
      onStreamH,
      bhpBar: round(bhpBar + (random() - 0.5) * 1.6),
      whpBar: round(isInjecting ? 120 + random() * 60 : 60 + random() * 10),
      bhtC: round(65 + random() * 10),
      whtC: round(12 + random() * 6),
      chokePct: null,
    };
  });
}

/** An observation well only records downhole pressure and temperature. */
function generateObservationRows(well: SyntheticWell, random: () => number): DailyProductionRow[] {
  const pressureStartBar = 230 + random() * 20;
  return Array.from({ length: PRODUCTION_DAYS }, (_, day) => ({
    wellName: well.name,
    date: addDays(PRODUCTION_START_DATE, day),
    oilSm3: null,
    gasSm3: null,
    waterSm3: null,
    waterInjSm3: null,
    onStreamH: null,
    bhpBar: round(pressureStartBar - 15 * (day / PRODUCTION_DAYS) + (random() - 0.5) * 0.8),
    whpBar: null,
    bhtC: round(104 + (random() - 0.5) * 0.4),
    whtC: null,
    chokePct: null,
  }));
}

/** Sums the daily volumes of the field into monthly rows, ignoring missing values. */
function generateFieldProduction(
  production: readonly DailyProductionRow[],
): SyntheticFieldProductionMonth[] {
  const months = new Map<string, SyntheticFieldProductionMonth>();
  for (const row of production) {
    const month = `${row.date.slice(0, 7)}-01`;
    const entry = months.get(month) ?? { month, oilSm3: 0, gasSm3: 0, waterSm3: 0 };
    entry.oilSm3 += row.oilSm3 ?? 0;
    entry.gasSm3 += row.gasSm3 ?? 0;
    entry.waterSm3 += row.waterSm3 ?? 0;
    months.set(month, entry);
  }
  return [...months.values()]
    .map((entry) => ({
      ...entry,
      oilSm3: round(entry.oilSm3),
      gasSm3: round(entry.gasSm3, 0),
      waterSm3: round(entry.waterSm3),
    }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

/** A simple deterministic survey for every well: vertical at the tie point, then a gentle build. */
function generateTrajectories(wells: readonly SyntheticWell[]): SyntheticTrajectoryStation[] {
  const stationCount = 7;
  return wells.flatMap((well, wellIndex) =>
    Array.from({ length: stationCount }, (_, stationIndex) => {
      const fraction = stationIndex / (stationCount - 1);
      const mdM = round(well.totalDepthM * fraction, 1);
      const inclDeg = stationIndex === 0 ? 0 : round((5 + (wellIndex % 5) * 4) * fraction, 1);
      const azimDeg = stationIndex === 0 ? 0 : round((90 + wellIndex * 17) % 360, 1);
      return {
        wellName: well.name,
        mdM,
        tvdM: round(mdM * Math.cos((inclDeg * Math.PI) / 180), 1),
        inclDeg,
        azimDeg,
      };
    }),
  );
}

/** Wells with logs: the first producers, enough to exercise the viewer and the "no logs" case. */
export const LOGGED_WELL_COUNT = 6;
const LOG_RANDOM_SEED = 20_250_202;
const LOG_STEP_M = 1;
const LOG_INTERVAL_M = 400;
/** Samples the density tool misses in one well, a gap the viewer must show as a gap. */
const LOG_GAP = { wellIndex: 0, mnemonic: 'RHOB', fromSample: 120, toSample: 140 };

/**
 * Gamma ray, deep resistivity, bulk density and neutron porosity over the last 400 m of each
 * logged well. Beds alternate between shale and sand; the upper sands carry oil and read a high
 * resistivity, the lower ones carry water.
 */
function generateLogs(wells: readonly SyntheticWell[]): SyntheticLogCurve[] {
  const random = createRandom(LOG_RANDOM_SEED);
  return wells.slice(0, LOGGED_WELL_COUNT).flatMap((well, wellIndex) => {
    const baseM = well.totalDepthM;
    const topM = baseM - LOG_INTERVAL_M;
    const sampleCount = LOG_INTERVAL_M / LOG_STEP_M + 1;
    const oilWaterContactSample = Math.floor(sampleCount * (0.55 + random() * 0.2));

    const gr: number[] = [];
    const rt: number[] = [];
    const rhob: number[] = [];
    const nphi: number[] = [];
    let isSand = false;
    let bedEnd = 0;
    for (let sample = 0; sample < sampleCount; sample += 1) {
      if (sample === bedEnd) {
        isSand = !isSand;
        bedEnd += 8 + Math.floor(random() * (isSand ? 30 : 45));
      }
      const hasOil = isSand && sample < oilWaterContactSample;
      const sandRtOhmM = hasOil ? 25 + random() * 120 : 0.6 + random() * 1.2;
      gr.push(round(isSand ? 28 + random() * 18 : 88 + random() * 32));
      rt.push(round(isSand ? sandRtOhmM : 2 + random() * 3, 2));
      rhob.push(round(isSand ? 2.18 + random() * 0.1 : 2.45 + random() * 0.1, 3));
      nphi.push(round(isSand ? 0.18 + random() * 0.07 : 0.3 + random() * 0.06, 3));
    }

    const curve = (mnemonic: string, unit: string, values: number[]): SyntheticLogCurve => ({
      wellName: well.name,
      mnemonic,
      unit,
      topM,
      baseM,
      samples: values.map((value, sample) =>
        wellIndex === LOG_GAP.wellIndex &&
        mnemonic === LOG_GAP.mnemonic &&
        sample >= LOG_GAP.fromSample &&
        sample < LOG_GAP.toSample
          ? null
          : value,
      ),
    });
    return [
      curve('GR', 'gAPI', gr),
      curve('RT', 'ohm.m', rt),
      curve('RHOB', 'g/cm3', rhob),
      curve('NPHI', 'v/v', nphi),
    ];
  });
}

/** Builds the full synthetic dataset. The same call always returns the same data. */
export function generateSyntheticDataset(): SyntheticDataset {
  const random = createRandom(RANDOM_SEED);
  const wells = generateWells(random);

  const production = wells.flatMap((well, index) => {
    switch (well.wellType) {
      case 'producer':
        return generateProducerRows(well, index, random);
      case 'injector':
        return generateInjectorRows(well, random);
      case 'observation':
        return generateObservationRows(well, random);
      case 'exploration':
        return [];
    }
  });

  const { minLon, maxLon, minLat, maxLat } = FIELD_BOUNDS;
  return {
    source: {
      name: 'PetroAtlas synthetic seed',
      license: 'MIT. Synthetic data generated by db/seed; not real measurements.',
      url: 'db/seed/generate.ts',
    },
    field: {
      name: 'SYNTHETIC ALPHA',
      operator: 'Demo Operator (fictitious)',
      status: 'producing',
      boundary: [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ],
    },
    wells,
    production,
    fieldProduction: generateFieldProduction(production),
    trajectories: generateTrajectories(wells),
    logs: generateLogs(wells),
  };
}
