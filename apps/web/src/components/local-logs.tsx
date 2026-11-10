'use client';

import type { LogCurve } from '@petroatlas/shared-types';
import { useId, useState } from 'react';

import { parseLas, type LasErrorCode } from '@/lib/las';

import { LogsChart } from './logs-chart';
import { useMessages } from './locale-provider';

const MAX_LAS_BYTES = 20 * 1024 * 1024;

interface LocalLogsProps {
  /** Remounts the component and discards the local file when the well changes. */
  wellKey: string;
}

/** Optional LAS file the visitor opens locally; the file never leaves the browser. */
export function LocalLogs({ wellKey }: LocalLogsProps) {
  const messages = useMessages();
  const inputId = useId();
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'reading' }
    | { status: 'error'; code: LasErrorCode | 'too_large' | 'read_error' }
    | { status: 'ready'; fileName: string; curves: LogCurve[] }
  >({ status: 'idle' });

  async function readFile(file: File): Promise<void> {
    if (file.size > MAX_LAS_BYTES) {
      setState({ status: 'error', code: 'too_large' });
      return;
    }
    setState({ status: 'reading' });
    try {
      const result = parseLas(await file.text());
      if (!result.ok) {
        setState({ status: 'error', code: result.code });
        return;
      }
      setState({ status: 'ready', fileName: file.name, curves: result.curves });
    } catch {
      setState({ status: 'error', code: 'read_error' });
    }
  }

  return (
    <section
      className="local-logs"
      aria-label={messages.wellSheet.logs.las.title}
      data-well={wellKey}
    >
      <div className="local-logs__form">
        <label htmlFor={inputId}>{messages.wellSheet.logs.las.open}</label>
        <input
          id={inputId}
          type="file"
          accept=".las,.txt,text/plain"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file !== undefined) void readFile(file);
          }}
        />
        {state.status === 'ready' && (
          <button
            type="button"
            onClick={() => {
              setState({ status: 'idle' });
            }}
          >
            {messages.wellSheet.logs.las.clear}
          </button>
        )}
      </div>
      <p className="chart-card__note">{messages.wellSheet.logs.las.hint}</p>
      {state.status === 'reading' && (
        <p className="well-sheet__notice" role="status">
          {messages.wellSheet.logs.las.reading}
        </p>
      )}
      {state.status === 'error' && (
        <p className="well-sheet__notice well-sheet__notice--error" role="alert">
          {messages.wellSheet.logs.las.errors[state.code]}
        </p>
      )}
      {state.status === 'ready' && (
        <LogsChart
          curves={state.curves}
          source={{
            name: messages.wellSheet.logs.las.sourceName,
            license: messages.wellSheet.logs.las.sourceLicense,
            url: '',
          }}
        />
      )}
    </section>
  );
}
