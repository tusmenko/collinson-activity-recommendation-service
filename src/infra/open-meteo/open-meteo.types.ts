import type { ZodType } from 'zod';

import type { OPEN_METEO_HOSTS } from './open-meteo.const';

// A point on the globe; the weather feature re-exports it as its own.
export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

// The failed branch every endpoint returns instead of throwing.
export interface OpenMeteoFailure {
  readonly kind: 'failed';
  readonly reason: 'timeout' | 'http' | 'malformed' | 'network';
  readonly detail: string;
  // The body when one was received but failed the schema, kept for replay and drift checks (D-8).
  readonly raw?: unknown;
}

export type OpenMeteoOutcome<T> =
  | {
      readonly kind: 'ok';
      readonly data: T;
      readonly raw: unknown;
      // ISO 8601, when the body arrived.
      readonly fetchedAt: string;
    }
  | OpenMeteoFailure;

// One endpoint call as the client's typed methods describe it to its private request.
export interface OpenMeteoRequest<T> {
  readonly host: keyof typeof OPEN_METEO_HOSTS;
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly schema: ZodType<T>;
  // Names the call in the log line: `<label> upstream call`.
  readonly label: string;
}
