'use client';

import { useId, useRef, useState } from 'react';

import {
  MAX_IMPORT_FILE_BYTES,
  MAX_REPORTED_ERRORS,
  exceedsSoftLimits,
  parseProductionCsv,
  type CsvImportResult,
  type CsvRowError,
} from '@/lib/csv-import';
import {
  clearImportedWells,
  deleteImportedWell,
  saveImportedWells,
  type ImportSummary,
  type ImportedWell,
} from '@/lib/imported-wells';

import { useMessages } from './locale-provider';

interface ImportPanelProps {
  importedWells: readonly ImportedWell[];
  onImportedChange: () => Promise<void> | void;
  onOpenImported: (well: ImportedWell) => void;
}

type ImportState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'review'; result: CsvImportResult; fieldUnits: boolean }
  | { status: 'saving' }
  | { status: 'done'; summary: ImportSummary; result: CsvImportResult }
  | { status: 'error'; message: string };

function errorColumn(error: CsvRowError): string {
  return error.column === null ? '' : ` (${error.column})`;
}

/** CSV import kept in the browser (RF-14; docs/09). */
export function ImportPanel({ importedWells, onImportedChange, onOpenImported }: ImportPanelProps) {
  const messages = useMessages();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fieldUnits, setFieldUnits] = useState(false);
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const [busyWell, setBusyWell] = useState<string | null>(null);

  async function store(result: CsvImportResult): Promise<void> {
    setState({ status: 'saving' });
    try {
      const summary = await saveImportedWells(result.wells);
      await onImportedChange();
      setState({ status: 'done', summary, result });
      if (fileRef.current !== null) fileRef.current.value = '';
    } catch {
      setState({ status: 'error', message: messages.importWells.saveError });
    }
  }

  async function readFile(file: File): Promise<void> {
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setState({ status: 'error', message: messages.importWells.readError });
      return;
    }
    setState({ status: 'reading' });
    try {
      const text = await file.text();
      const result = parseProductionCsv(text, {
        fieldUnits,
        knownWellSlugs: new Set(importedWells.map((well) => well.slug)),
      });
      if (result.fatal !== null) {
        setState({ status: 'review', result, fieldUnits });
        return;
      }
      if (exceedsSoftLimits(result)) {
        setState({ status: 'review', result, fieldUnits });
        return;
      }
      await store(result);
    } catch {
      setState({ status: 'error', message: messages.importWells.readError });
    }
  }

  const fatal =
    state.status === 'review' && state.result.fatal !== null ? state.result.fatal : null;
  const review = state.status === 'review' ? state.result : null;
  const needsConfirmation = review !== null && review.fatal === null && exceedsSoftLimits(review);
  const done = state.status === 'done' ? state : null;

  return (
    <section className="import-panel" aria-labelledby="import-heading">
      <h3 id="import-heading">{messages.importWells.title}</h3>
      <p className="filter-panel__hint">{messages.importWells.intro}</p>

      <div className="import-panel__form">
        <label htmlFor={fileId}>{messages.importWells.file}</label>
        <input
          ref={fileRef}
          id={fileId}
          type="file"
          accept=".csv,text/csv,text/plain"
          disabled={state.status === 'reading' || state.status === 'saving'}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            // Reset it so choosing the same file again after fixing it fires another change.
            event.currentTarget.value = '';
            if (file !== undefined) void readFile(file);
          }}
        />
        <fieldset className="filter-group">
          <legend>{messages.importWells.units}</legend>
          <label className="filter-group__option">
            <input
              type="radio"
              name="import-units"
              checked={!fieldUnits}
              onChange={() => {
                setFieldUnits(false);
              }}
            />
            {messages.importWells.unitsSi}
          </label>
          <label className="filter-group__option">
            <input
              type="radio"
              name="import-units"
              checked={fieldUnits}
              onChange={() => {
                setFieldUnits(true);
              }}
            />
            {messages.importWells.unitsField}
          </label>
        </fieldset>
        <p className="filter-panel__hint">{messages.importWells.limits}</p>
      </div>

      {(state.status === 'reading' || state.status === 'saving') && (
        <p className="filter-panel__hint" role="status">
          {messages.importWells.importing}
        </p>
      )}
      {state.status === 'error' && (
        <p className="filter-panel__hint filter-panel__hint--error" role="alert">
          {state.message}
        </p>
      )}

      {fatal !== null && (
        <p className="filter-panel__hint filter-panel__hint--error" role="alert">
          {fatal.code === 'empty'
            ? messages.importWells.fatal.empty
            : fatal.code === 'missing_columns'
              ? messages.importWells.fatal.missing_columns(fatal.columns)
              : messages.importWells.fatal.no_volume_column}
        </p>
      )}

      {review !== null && fatal === null && (
        <div className="import-panel__review" role="status">
          <p>
            {messages.importWells.totalRows(review.totalRows, review.errorCount)}
            {needsConfirmation && (
              <> {messages.importWells.softLimit(review.wells.length, review.validRows)}</>
            )}
          </p>
          {needsConfirmation && (
            <button
              type="button"
              onClick={() => {
                void store(review);
              }}
            >
              {messages.importWells.confirmImport}
            </button>
          )}
          <ImportErrors errors={review.errors} errorCount={review.errorCount} />
        </div>
      )}

      {done !== null && (
        <div className="import-panel__summary" role="status">
          <p>
            {done.summary.addedRows === 0
              ? messages.importWells.nothingImported
              : messages.importWells.summary(
                  done.summary.wells,
                  done.summary.addedRows,
                  done.summary.skippedRows,
                )}
          </p>
          <ImportErrors errors={done.result.errors} errorCount={done.result.errorCount} />
        </div>
      )}

      <section className="import-panel__list" aria-labelledby="imported-list-heading">
        <h4 id="imported-list-heading">
          {messages.importWells.listTitle} ({importedWells.length})
        </h4>
        {importedWells.length === 0 ? (
          <p className="filter-panel__hint">{messages.importWells.empty}</p>
        ) : (
          <>
            <ul>
              {importedWells.map((well) => {
                const from = well.dates[0] ?? '';
                const to = well.dates.at(-1) ?? '';
                return (
                  <li key={well.slug} className="import-panel__well">
                    <div>
                      <strong>{well.name}</strong>
                      <span>{messages.importWells.wellSummary(well.dates.length, from, to)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenImported(well);
                      }}
                    >
                      {messages.importWells.open}
                    </button>
                    <button
                      type="button"
                      aria-label={messages.importWells.deleteLabel(well.name)}
                      disabled={busyWell === well.slug}
                      onClick={() => {
                        setBusyWell(well.slug);
                        void deleteImportedWell(well.slug)
                          .then(() => onImportedChange())
                          .catch(() => {
                            setState({ status: 'error', message: messages.importWells.saveError });
                          })
                          .finally(() => {
                            setBusyWell(null);
                          });
                      }}
                    >
                      {messages.importWells.delete}
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="import-panel__clear"
              onClick={() => {
                if (!window.confirm(messages.importWells.clearConfirm)) return;
                void clearImportedWells()
                  .then(() => onImportedChange())
                  .catch(() => {
                    setState({ status: 'error', message: messages.importWells.saveError });
                  });
              }}
            >
              {messages.importWells.clear}
            </button>
          </>
        )}
        <p className="filter-panel__hint">{messages.importWells.notice}</p>
        <p className="filter-panel__hint">{messages.importWells.shareNote}</p>
      </section>
    </section>
  );
}

function ImportErrors({
  errors,
  errorCount,
}: {
  errors: readonly CsvRowError[];
  errorCount: number;
}) {
  const messages = useMessages();
  if (errors.length === 0) return null;
  return (
    <details className="import-panel__errors">
      <summary>
        {messages.importWells.errorsTitle} ({errorCount})
      </summary>
      <table>
        <thead>
          <tr>
            <th scope="col">{messages.importWells.line}</th>
            <th scope="col">{messages.importWells.reason}</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error) => (
            <tr key={`${String(error.line)}:${error.code}:${error.column ?? ''}`}>
              <th scope="row">{error.line}</th>
              <td>
                {messages.importWells.error[error.code]}
                {errorColumn(error)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {errorCount > MAX_REPORTED_ERRORS && (
        <p>{messages.importWells.errorsTruncated(MAX_REPORTED_ERRORS)}</p>
      )}
    </details>
  );
}
