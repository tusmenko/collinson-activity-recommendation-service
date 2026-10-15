import type { ZodType } from 'zod';

import type { OPEN_METEO_HOSTS } from './open-meteo.const';

export type OpenMeteoEndpoint = keyof typeof OPEN_METEO_HOSTS;

type UpstreamFailureReason = 'timeout' | 'http' | 'malformed' | 'network';

// The failed branch every upstream call returns instead of throwing.
export interface UpstreamFailure {
  readonly kind: 'failed';
  readonly reason: UpstreamFailureReason;
  readonly detail: string;
  // The body when one was received but failed the schema, kept for replay and drift checks (D-8).
  readonly raw?: unknown;
}

export type ClientOutcome<T> =
  { readonly kind: 'ok'; readonly data: T; readonly raw: unknown } | UpstreamFailure;

export interface OpenMeteoRequest<T> {
  readonly endpoint: OpenMeteoEndpoint;
  readonly path: string;
  readonly params: URLSearchParams;
  // The pinned payload schema and its version (R-9); the version is logged with the call.
  readonly schema: ZodType<T>;
  readonly schemaVersion: string;
  // Names the call in the log line: `<label> upstream call`.
  readonly label: string;
}
