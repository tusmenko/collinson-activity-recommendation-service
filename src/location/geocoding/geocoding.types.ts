import type { GeocodingOutcome } from '../location.types';

export type GeocodingFailure = Extract<GeocodingOutcome, { kind: 'failed' }>;
