/**
 * Builds a parametrized WHERE clause from optional filters. Conditions are fixed SQL fragments
 * written in the code; every value travels as a query parameter, never concatenated.
 */
export interface SqlFilter {
  /** Adds a condition when `value` is defined. `condition` receives the placeholder, e.g. `$2`. */
  add: (condition: (placeholder: string) => string, value: unknown) => void;
  /** Registers a value without a condition and returns its placeholder. */
  param: (value: unknown) => string;
  /** `WHERE a AND b`, or an empty string when no condition was added. */
  where: () => string;
  values: unknown[];
}

export function createSqlFilter(): SqlFilter {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const param = (value: unknown): string => {
    values.push(value);
    return `$${String(values.length)}`;
  };
  return {
    add: (condition, value) => {
      if (value !== undefined) conditions.push(condition(param(value)));
    },
    param,
    where: () => (conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''),
    values,
  };
}
