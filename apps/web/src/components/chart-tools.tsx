'use client';

import type { SourceRef } from '@petroatlas/shared-types';
import { useState } from 'react';

import { downloadCsv, downloadDataUrl, safeFileName, type TableData } from '@/lib/export';
import { messages } from '@/messages/es';

const NUMBER_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 4 });

/** Options of the PNG a chart exports: twice the screen resolution, on a white background. */
export const PNG_EXPORT_OPTIONS = {
  type: 'png',
  pixelRatio: 2,
  backgroundColor: '#ffffff',
} as const;

/** Source and licence under a chart (docs/07, rule 7). A source without address is plain text. */
export function ChartSource({ source }: { source: SourceRef | readonly SourceRef[] }) {
  const sources: readonly SourceRef[] = Array.isArray(source) ? source : [source];
  return (
    <p className="chart-card__source">
      {messages.wellSheet.charts.source}:{' '}
      {sources.map((item, index) => (
        <span key={`${item.name}|${item.url}`}>
          {index > 0 && ' · '}
          {item.url === '' ? (
            item.name
          ) : (
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.name}
            </a>
          )}{' '}
          · {item.license}
        </span>
      ))}
    </p>
  );
}

interface ChartToolsProps {
  /** Title of the chart, used to name the buttons and the files. */
  title: string;
  /** Every point of the chart, for the table view (docs/07, rule 8). */
  table: TableData;
  /** What the CSV holds when it is not the whole table, such as the visible zoom window. */
  getCsvTable?: () => TableData;
  /** PNG of the chart as a data URL, or null while the chart is not drawn. */
  getImage: () => string | null;
}

/** Table view and CSV/PNG export of a chart (docs/07, rules 8 and 12). */
export function ChartTools({ title, table, getCsvTable, getImage }: ChartToolsProps) {
  const [showTable, setShowTable] = useState(false);
  const fileName = safeFileName(title);

  return (
    <>
      <div className="chart-card__tools">
        <button
          type="button"
          className="chart-card__tool"
          aria-expanded={showTable}
          aria-label={`${showTable ? messages.wellSheet.charts.hideTable : messages.wellSheet.charts.table}: ${title}`}
          onClick={() => {
            setShowTable((current) => !current);
          }}
        >
          {showTable ? messages.wellSheet.charts.hideTable : messages.wellSheet.charts.table}
        </button>
        <button
          type="button"
          className="chart-card__tool"
          aria-label={`${messages.wellSheet.charts.exportCsv}: ${title}`}
          onClick={() => {
            downloadCsv(`${fileName}.csv`, getCsvTable?.() ?? table);
          }}
        >
          {messages.wellSheet.charts.exportCsv}
        </button>
        <button
          type="button"
          className="chart-card__tool"
          aria-label={`${messages.wellSheet.charts.exportPng}: ${title}`}
          onClick={() => {
            const image = getImage();
            if (image !== null) downloadDataUrl(`${fileName}.png`, image);
          }}
        >
          {messages.wellSheet.charts.exportPng}
        </button>
      </div>
      {showTable && (
        // The region is focusable so that a keyboard user can scroll it.
        <div
          className="chart-card__table-wrapper"
          role="region"
          aria-label={`${messages.wellSheet.charts.tableOf} ${title}`}
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                {table.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                // Rows are static and may repeat their first cell, so the index is the key.
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => {
                    const text =
                      cell === null
                        ? '—'
                        : typeof cell === 'number'
                          ? NUMBER_FORMAT.format(cell)
                          : cell;
                    return cellIndex === 0 ? (
                      <th key={cellIndex} scope="row">
                        {text}
                      </th>
                    ) : (
                      <td key={cellIndex}>{text}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
