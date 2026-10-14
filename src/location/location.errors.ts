import type { UpstreamFailureReason } from './location.types.js';

// Mapped to the GraphQL NOT_FOUND code by the api error filter (design D-3, D-8).
export class LocationNotFoundError extends Error {
  readonly code = 'NOT_FOUND';

  constructor(readonly city: string) {
    super(`No location found for "${city}"`);
    this.name = 'LocationNotFoundError';
  }
}

// Mapped to UPSTREAM_UNAVAILABLE; geocoding has no stored fallback.
export class GeocodingUnavailableError extends Error {
  readonly code = 'UPSTREAM_UNAVAILABLE';

  constructor(readonly reason: UpstreamFailureReason) {
    super(`Geocoding unavailable: ${reason}`);
    this.name = 'GeocodingUnavailableError';
  }
}
