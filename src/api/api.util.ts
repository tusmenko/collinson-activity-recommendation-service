import type { LocationFacts } from '../location/index.js';
import type { LocationModel } from './models/location.model.js';

// The public fields of a location: the Location type, and the UPSTREAM_UNAVAILABLE error's extensions.
export function locationView(facts: LocationFacts): Omit<LocationModel, 'facts'> {
  return {
    id: facts.id,
    name: facts.name,
    region: facts.admin1 ?? null,
    country: facts.country,
    latitude: facts.latitude,
    longitude: facts.longitude,
    timezone: facts.timezone,
    elevation: facts.elevation ?? null,
  };
}
