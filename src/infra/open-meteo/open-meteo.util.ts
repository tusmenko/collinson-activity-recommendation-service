import type { UpstreamFailure } from './open-meteo.types';

// A thrown fetch or JSON parse error as a failed outcome.
export function failureOf(error: unknown): UpstreamFailure {
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
