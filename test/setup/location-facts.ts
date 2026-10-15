import type { LocationFacts } from '../../src/location/index';
import { FIXED_NOW } from './fixed-clock';

// Stored facts for unit tests that need a location but not a recorded place.
export function locationFacts(overrides: Partial<LocationFacts> = {}): LocationFacts {
  return {
    id: '2988507',
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    admin1: 'Île-de-France',
    latitude: 48.85341,
    longitude: 2.3488,
    elevation: 42,
    timezone: 'Europe/Paris',
    marineDataAvailable: 'unknown',
    updatedAt: FIXED_NOW.toISOString(),
    ...overrides,
  };
}
