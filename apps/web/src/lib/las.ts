/**
 * Minimal LAS 2.0 reader for files the visitor opens in the browser (docs/07, "Registros").
 * The file never leaves the browser. Only the curves and the depth column are used; the rest of
 * the metadata is ignored.
 */
import type { LogCurve } from '@petroatlas/shared-types';

export type LasErrorCode =
  'empty' | 'no_curves' | 'no_data' | 'no_depth' | 'bad_value' | 'incomplete_row' | 'wrapped';

export type LasResult =
  { ok: true; wellName: string | null; curves: LogCurve[] } | { ok: false; code: LasErrorCode };

function parseHeaderLine(line: string): { key: string; value: string; unit: string | null } | null {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;
  const match = /^([A-Za-z0-9_]+)\s*\.?\s*(.*)$/.exec(trimmed);
  if (match === null) return null;
  const [, key = '', rest = ''] = match;
  const withoutComment = rest.split('#')[0]?.trim() ?? '';
  const parts = withoutComment.split(/\s+/).filter((part) => part !== '');
  if (
    ['STRT', 'STOP', 'STEP'].includes(key.toUpperCase()) &&
    parts.length > 1 &&
    /^[A-Za-z/]+$/.test(parts[0] ?? '')
  ) {
    return {
      key: key.toUpperCase(),
      value: parts.slice(1).join(' '),
      unit: parts[0] ?? null,
    };
  }
  return { key: key.toUpperCase(), value: withoutComment, unit: null };
}

/** `undefined` means the token is not a number; `null` is the LAS null value. */
function numberOrNull(token: string, nullValue: number | null): number | null | undefined {
  if (token === '') return null;
  const value = Number(token);
  if (!Number.isFinite(value)) return undefined;
  return nullValue !== null && value === nullValue ? null : value;
}

function depthFactor(unit: string | null): number {
  return unit !== null && ['F', 'FT', 'FEET'].includes(unit.toUpperCase()) ? 0.3048 : 1;
}

/** Parses a LAS file. Values keep the units declared by each curve; depth is converted to m. */
export function parseLas(text: string): LasResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines.every((line) => line.trim() === '')) return { ok: false, code: 'empty' };

  let section = '';
  let wellName: string | null = null;
  let start: number | null = null;
  let step: number | null = null;
  let nullValue: number | null = null;
  let wrapped = false;
  let factor = 1;
  const curveHeaders: { mnemonic: string; unit: string | null }[] = [];
  const dataTokens: string[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('~')) {
      const name = trimmed.slice(1).trim().toUpperCase();
      section = name.charAt(0);
      continue;
    }

    if (section === 'C') {
      const match = /^([A-Za-z0-9_]+)(?:\.([^\s:]+))?/.exec(trimmed);
      if (match !== null) {
        const [, mnemonic = '', unit] = match;
        curveHeaders.push({ mnemonic: mnemonic.toUpperCase(), unit: unit ?? null });
      }
      continue;
    }

    if (section === 'W' || section === 'P') {
      const parsed = parseHeaderLine(trimmed);
      if (parsed === null) continue;
      if (parsed.key === 'WELL') wellName = parsed.value || null;
      if (parsed.key === 'STRT') {
        start = Number(parsed.value);
        factor = depthFactor(parsed.unit ?? curveHeaders[0]?.unit ?? null);
      }
      if (parsed.key === 'STEP') step = Number(parsed.value);
      if (parsed.key === 'NULL') nullValue = Number(parsed.value);
      if (parsed.key === 'WRAP') wrapped = parsed.value.toUpperCase() === 'YES';
      continue;
    }

    if (section === 'A') {
      dataTokens.push(trimmed.split(/[\s,]+/).filter((token) => token !== ''));
    }
  }

  if (wrapped) return { ok: false, code: 'wrapped' };
  if (curveHeaders.length < 2) return { ok: false, code: 'no_curves' };
  if (dataTokens.length === 0) return { ok: false, code: 'no_data' };

  const depthHeader = curveHeaders[0];
  if (depthHeader === undefined || !['DEPT', 'DEPTH', 'MD', 'TVD'].includes(depthHeader.mnemonic)) {
    return { ok: false, code: 'no_depth' };
  }

  for (const row of dataTokens) {
    if (row.length !== curveHeaders.length) return { ok: false, code: 'incomplete_row' };
  }

  const depths = dataTokens.map((row) => numberOrNull(row[0] ?? '', nullValue));
  if (depths.some((depth) => depth === null || depth === undefined)) {
    return { ok: false, code: 'bad_value' };
  }
  if (start === null) factor = depthFactor(curveHeaders[0]?.unit ?? null);
  const numericDepths = (depths as number[]).map((depth) => depth * factor);
  const first = start === null ? (numericDepths[0] ?? 0) : start * factor;
  const last = numericDepths.at(-1) ?? first;
  const depthStep =
    step === null
      ? numericDepths.length > 1
        ? (numericDepths[1] ?? first) - first
        : 1
      : step * factor;
  if (!Number.isFinite(depthStep) || depthStep <= 0) return { ok: false, code: 'bad_value' };

  const curves: LogCurve[] = [];
  for (const [curveIndex, curve] of curveHeaders.slice(1).entries()) {
    const values = dataTokens.map((row) => numberOrNull(row[curveIndex + 1] ?? '', nullValue));
    if (values.some((value) => value === undefined)) return { ok: false, code: 'bad_value' };
    curves.push({
      mnemonic: curve.mnemonic,
      unit: curve.unit,
      topM: first,
      baseM: last,
      stepM: depthStep,
      values: values as (number | null)[],
    });
  }

  return { ok: true, wellName, curves };
}
