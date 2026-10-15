import type { LocationFacts, MarineAvailability } from '../location.types';

// Location facts (no TTL) and geocode results (GEOCODE_TTL), design D-4.
export abstract class FactsRepositoryPort {
  abstract getLocation(id: string): Promise<LocationFacts | null>;

  // One round trip for a geocode hit; null for each id with no stored facts.
  abstract getLocations(ids: readonly string[]): Promise<(LocationFacts | null)[]>;

  abstract saveLocation(facts: LocationFacts): Promise<void>;

  abstract getGeocode(normalisedQuery: string): Promise<string[] | null>;

  abstract saveGeocode(normalisedQuery: string, ids: readonly string[]): Promise<void>;

  abstract setMarineAvailability(id: string, value: MarineAvailability): Promise<void>;
}
