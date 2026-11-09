/** Writes an error as one JSON line. Details go to the log, never to the response (docs/12). */
export function logError(message: string, error: unknown): void {
  const detail = error instanceof Error ? { name: error.name, message: error.message } : { error };
  console.error(
    JSON.stringify({ level: 'error', time: new Date().toISOString(), message, detail }),
  );
}
