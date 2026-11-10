import { z } from 'zod';

/** Enumerations from docs/04-modelo-de-dominio.md. Each source's values are mapped in the ETL. */
export const wellTypeSchema = z.enum(['producer', 'injector', 'exploration', 'observation']);
export type WellType = z.infer<typeof wellTypeSchema>;

export const wellStatusSchema = z.enum([
  'producing',
  'injecting',
  'shut_in',
  'abandoned',
  'unknown',
]);
export type WellStatus = z.infer<typeof wellStatusSchema>;

export const fieldStatusSchema = z.enum(['producing', 'shut_down', 'approved', 'unknown']);
export type FieldStatus = z.infer<typeof fieldStatusSchema>;
