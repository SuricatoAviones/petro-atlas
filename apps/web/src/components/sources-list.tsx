'use client';

import type { SourceListResponse } from '@petroatlas/shared-types';
import { useEffect, useState } from 'react';

import { fetchSources } from '@/lib/api';

import { useLocale, useMessages } from './locale-provider';

type Source = SourceListResponse['items'][number];

interface SourcesState {
  status: 'loading' | 'ready' | 'error';
  /** Request that produced the state, so a retry shows the loading state immediately. */
  key: number;
  items: readonly Source[];
}

function formatIngestDate(isoDate: string, locale: string): string {
  return `${new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(isoDate))} UTC`;
}

function isHttpUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}

/** Source list of the "Fuentes y licencias" page (docs/10). */
export function SourcesList() {
  const messages = useMessages();
  const { locale } = useLocale();
  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<SourcesState>({
    status: 'loading',
    key: 0,
    items: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchSources(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setState({ status: 'ready', key: requestKey, items });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState((current) => ({ status: 'error', key: requestKey, items: current.items }));
        }
      });
    return () => {
      controller.abort();
    };
  }, [requestKey]);

  const isLoading = state.key !== requestKey || state.status === 'loading';
  const hasError = state.key === requestKey && state.status === 'error';

  if (isLoading) {
    return (
      <p className="page__notice" role="status">
        {messages.sources.loading}
      </p>
    );
  }

  if (hasError) {
    return (
      <div className="page__notice page__notice--error" role="alert">
        <p>{messages.sources.loadError}</p>
        <button
          type="button"
          onClick={() => {
            setRequestKey((current) => current + 1);
          }}
        >
          {messages.sources.retry}
        </button>
      </div>
    );
  }

  return (
    <ul className="source-list">
      {state.items.map((source) => (
        <li key={source.id} className="source-card">
          <h2>{source.name}</h2>
          <p className="source-card__license">
            <strong>{messages.sources.license}:</strong> {source.license}
          </p>
          <p className="source-card__ingest">
            <strong>{messages.sources.lastIngest}:</strong>{' '}
            {source.ingestedAt === null ? (
              messages.sources.neverIngested
            ) : (
              <time dateTime={source.ingestedAt}>
                {formatIngestDate(source.ingestedAt, locale)}
              </time>
            )}
          </p>
          {isHttpUrl(source.url) ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.url}
            </a>
          ) : (
            <code>{source.url}</code>
          )}
        </li>
      ))}
    </ul>
  );
}
