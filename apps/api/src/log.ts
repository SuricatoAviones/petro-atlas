/**
 * Writes an error as one JSON line, with its stack and cause chain. Details go to the log, never
 * to the response (docs/12).
 */
export function logError(message: string, error: unknown): void {
  console.error(
    JSON.stringify({
      level: 'error',
      time: new Date().toISOString(),
      message,
      detail: describeError(error),
    }),
  );
}

function describeError(error: unknown): unknown {
  if (!(error instanceof Error)) return { error };
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.cause === undefined ? {} : { cause: describeError(error.cause) }),
  };
}
