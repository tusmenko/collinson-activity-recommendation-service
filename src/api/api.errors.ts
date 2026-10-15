import type { LocationFacts } from '../location/index.js';

// No forecast to serve for a resolved location; carries it so the client can show where (D-8).
export class UpstreamUnavailableError extends Error {
  readonly code = 'UPSTREAM_UNAVAILABLE';

  constructor(
    readonly location: LocationFacts,
    readonly retryAfterSeconds: number,
  ) {
    super(`Forecast unavailable for ${location.name}: the upstream failed and nothing is stored`);
    this.name = 'UpstreamUnavailableError';
  }
}
