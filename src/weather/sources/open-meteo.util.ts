import type { Series, SourceFetchFailure } from './sources.types.js';

// Shared by the forecast and marine adapters: a thrown fetch or parse error as a failed outcome.
export function failureOf(error: unknown): SourceFetchFailure {
  const name = error instanceof Error ? error.name : '';
  const detail = error instanceof Error ? error.message : String(error);
  if (name === 'TimeoutError' || name === 'AbortError') {
    return { kind: 'failed', reason: 'timeout', detail };
  }
  if (error instanceof SyntaxError) {
    return { kind: 'failed', reason: 'malformed', detail };
  }
  return { kind: 'failed', reason: 'network', detail };
}

export function at(values: Series, index: number): number | null {
  return values[index] ?? null;
}
