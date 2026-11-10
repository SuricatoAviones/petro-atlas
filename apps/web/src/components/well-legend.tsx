import {
  wellStatusSchema,
  wellTypeSchema,
  type WellStatus,
  type WellType,
} from '@petroatlas/shared-types';
import { useId } from 'react';

import { messages } from '@/messages/es';

import {
  WELL_COLOR_MODES,
  WELL_FALLBACK_COLOR,
  WELL_STATUS_COLORS,
  WELL_TYPE_COLORS,
  type WellColorMode,
} from './well-colors';

const WELL_STATUSES: readonly WellStatus[] = wellStatusSchema.options;
const WELL_TYPES: readonly WellType[] = wellTypeSchema.options;

interface LegendEntry {
  key: string;
  label: string;
  color: string;
}

interface WellLegendProps {
  colorMode: WellColorMode;
  onColorModeChange: (mode: WellColorMode) => void;
}

/** Colour mode switch and key of the map symbols. Colour is always paired with a text label. */
export function WellLegend({ colorMode, onColorModeChange }: WellLegendProps) {
  const headingId = useId();

  const entries: readonly LegendEntry[] =
    colorMode === 'status'
      ? WELL_STATUSES.map((status) => ({
          key: status,
          label: messages.wellStatus[status],
          color: WELL_STATUS_COLORS[status],
        }))
      : [
          ...WELL_TYPES.map((type) => ({
            key: type,
            label: messages.wellType[type],
            color: WELL_TYPE_COLORS[type],
          })),
          { key: 'unknown', label: messages.map.legend.unknownType, color: WELL_FALLBACK_COLOR },
        ];

  return (
    <section className="legend" aria-labelledby={headingId}>
      <h3 id={headingId}>{messages.map.legend.title}</h3>
      <fieldset className="legend__mode">
        <legend>{messages.map.colorMode.legend}</legend>
        {WELL_COLOR_MODES.map((mode) => (
          <label key={mode} className="legend__mode-option">
            <input
              type="radio"
              name="well-color-mode"
              value={mode}
              checked={colorMode === mode}
              onChange={() => {
                onColorModeChange(mode);
              }}
            />
            {messages.map.colorMode[mode]}
          </label>
        ))}
      </fieldset>
      <ul className="legend__items">
        {entries.map((entry) => (
          <li key={entry.key}>
            <span
              className="legend__swatch"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            {entry.label}
          </li>
        ))}
      </ul>
      <ul className="legend__symbols">
        <li>
          <span className="legend__cluster" aria-hidden="true" />
          {messages.map.legend.cluster}
        </li>
        <li>
          <span className="legend__field" aria-hidden="true" />
          {messages.map.legend.field}
        </li>
        <li>
          <span className="legend__imported" aria-hidden="true" />
          {messages.map.legend.imported}
        </li>
      </ul>
    </section>
  );
}
