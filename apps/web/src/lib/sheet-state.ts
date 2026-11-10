/** Tab and unit system of the well sheet, also serialized in the URL (docs/09). */
export type SheetTab =
  'summary' | 'production' | 'operation' | 'trajectory' | 'logs' | 'engineering' | 'diagnostics';
export type UnitSystem = 'si' | 'field';

/** Window of the decline-curve fit, serialized as `ajuste=start,end` (docs/09). */
export interface FitWindow {
  start: string;
  end: string;
}

export const SHEET_TAB_PARAM: Record<SheetTab, string> = {
  summary: 'ficha',
  production: 'produccion',
  operation: 'operacion',
  trajectory: 'trayectoria',
  logs: 'registros',
  engineering: 'ingenieria',
  diagnostics: 'diagnostico',
};

export function parseSheetTab(value: string | null): SheetTab {
  const match = Object.entries(SHEET_TAB_PARAM).find(([, param]) => param === value);
  return match === undefined ? 'summary' : (match[0] as SheetTab);
}

export function parseUnitSystem(value: string | null): UnitSystem {
  return value === 'campo' ? 'field' : 'si';
}

/** Other wells that can be added to the comparison of the open one (RF-10). */
export const MAX_COMPARED_WELLS = 8;
