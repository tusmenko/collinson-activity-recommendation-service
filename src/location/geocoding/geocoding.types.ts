import type { GeocodingOutcome } from '../location.types.js';

export type GeocodingFailure = Extract<GeocodingOutcome, { kind: 'failed' }>;
