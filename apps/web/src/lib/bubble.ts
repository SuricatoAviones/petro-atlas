/** Bubble map helpers: fluid selection, cumulative value and radius scale (docs/07). */
import type { WellCumulative } from '@petroatlas/shared-types';

export type BubbleFluid = 'oil' | 'gas' | 'water';

export const BUBBLE_FLUIDS: readonly BubbleFluid[] = ['oil', 'gas', 'water'];

export const BUBBLE_MIN_RADIUS = 3;
export const BUBBLE_MAX_RADIUS = 24;

export function bubbleValue(item: WellCumulative, fluid: BubbleFluid): number | null {
  if (fluid === 'oil') return item.oilSm3;
  if (fluid === 'gas') return item.gasSm3;
  return item.waterSm3;
}

export function bubbleMaximum(items: readonly WellCumulative[], fluid: BubbleFluid): number {
  return items.reduce((maximum, item) => Math.max(maximum, bubbleValue(item, fluid) ?? 0), 0);
}

/** Area is proportional to the value, so the radius follows its square root. */
export function bubbleRadius(value: number, maximum: number): number {
  if (maximum <= 0 || value <= 0) return 0;
  return BUBBLE_MIN_RADIUS + (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS) * Math.sqrt(value / maximum);
}

const VOLUME_FORMAT = new Intl.NumberFormat('es', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatVolume(value: number): string {
  return `${VOLUME_FORMAT.format(value)} Sm³`;
}
