'use client';

import { useCallback, useRef, useSyncExternalStore, type RefObject } from 'react';

/**
 * Live width of an element: the ResizeObserver is the external system, and
 * `useSyncExternalStore` carries its updates without effect setState.
 *
 * Width 0 means "not measured yet" (server render, first paint).
 */
export function useElementWidth<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  width: number;
} {
  const ref = useRef<T>(null);

  const subscribe = useCallback((onChange: () => void) => {
    const element = ref.current;
    if (element === null) {
      // Nothing attached yet: nothing to unsubscribe either.
      return () => undefined;
    }
    const observer = new ResizeObserver(onChange);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const getSnapshot = useCallback(() => ref.current?.clientWidth ?? 0, []);

  return { ref, width: useSyncExternalStore(subscribe, getSnapshot, () => 0) };
}
