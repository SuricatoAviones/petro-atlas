/** Tab and unit system of the well sheet, also serialized in the URL (docs/09). */
export type SheetTab = 'summary' | 'production' | 'operation';
export type UnitSystem = 'si' | 'field';

export const SHEET_TAB_PARAM: Record<SheetTab, string> = {
  summary: 'ficha',
  production: 'produccion',
  operation: 'operacion',
};

export function parseSheetTab(value: string | null): SheetTab {
  if (value === 'produccion') return 'production';
  if (value === 'operacion') return 'operation';
  return 'summary';
}

export function parseUnitSystem(value: string | null): UnitSystem {
  return value === 'campo' ? 'field' : 'si';
}
