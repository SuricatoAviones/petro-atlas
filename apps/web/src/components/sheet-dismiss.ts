'use client';

import { useCallback, useRef, useState, type PointerEvent } from 'react';

/** How far the sheet must be pulled down before releasing to dismiss it. */
const DISMISS_THRESHOLD_PX = 96;

/**
 * Pull-down-to-dismiss for bottom sheets (ADR 0007). The handlers go on the
 * sheet's grabber bar only, never on its content, so scrolling inside the sheet
 * cannot close it by accident. Dragging is an extra: every sheet keeps its
 * close button and Escape handling (WCAG 2.5.7).
 */
export function useSheetDismiss(onDismiss: () => void) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const startYRef = useRef<number | null>(null);

  const applyOffset = useCallback((value: number): void => {
    offsetRef.current = value;
    setOffset(value);
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startYRef.current = event.clientY;
    // Keep receiving move events even if the pointer leaves the grabber.
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (startYRef.current === null) return;
      applyOffset(Math.max(0, event.clientY - startYRef.current));
    },
    [applyOffset],
  );

  const endDrag = useCallback(
    (commit: boolean) => {
      if (startYRef.current === null) return;
      startYRef.current = null;
      const moved = offsetRef.current;
      applyOffset(0);
      if (commit && moved >= DISMISS_THRESHOLD_PX) onDismiss();
    },
    [applyOffset, onDismiss],
  );

  const handlePointerUp = useCallback(() => {
    endDrag(true);
  }, [endDrag]);

  const handlePointerCancel = useCallback(() => {
    // The system interrupted the gesture: snap back without dismissing.
    endDrag(false);
  }, [endDrag]);

  return {
    /** Downward translation in px to apply to the sheet while dragging. */
    offset,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
