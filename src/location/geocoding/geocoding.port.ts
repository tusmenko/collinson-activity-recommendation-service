import type { GeocodingOutcome } from '../location.types';

// Never throws: every upstream problem is a `failed` outcome.
export abstract class GeocodingPort {
  abstract search(name: string): Promise<GeocodingOutcome>;
}
