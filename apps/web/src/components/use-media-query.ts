'use client';

import { useCallback, useSyncExternalStore } from 'react';

function subscribe(query: string, onChange: () => void): () => void {
  const mediaQueryList = window.matchMedia(query);
  mediaQueryList.addEventListener('change', onChange);
  return () => {
    mediaQueryList.removeEventListener('change', onChange);
  };
}

/**
 * Matches a CSS media query on the client. Server-side and first render always
 * return `initial`, so markup must not depend on the value to avoid hydration
 * mismatches; use it for behaviour (handlers, focus, inert) and let CSS handle
 * visibility.
 */
export function useMediaQuery(query: string, initial = false): boolean {
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => initial, [initial]);
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    getSnapshot,
    getServerSnapshot,
  );
}
