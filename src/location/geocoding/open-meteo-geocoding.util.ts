import type { GeocodingResult } from '../location.types.js';
import type { GeocodingFailure } from './geocoding.types.js';
import type { OpenMeteoGeocoding } from './open-meteo-geocoding.schema.js';

export function failureOf(error: unknown): GeocodingFailure {
  const name = error instanceof Error ? error.name : '';
  const detail = error instanceof Error ? error.message : String(error);
  if (name === 'TimeoutError' || name === 'AbortError') {
    return { kind: 'failed', reason: 'timeout', detail };
  }
  if (error instanceof SyntaxError) {
    return { kind: 'failed', reason: 'malformed', detail };
  }
  return { kind: 'failed', reason: 'network', detail };
}

// Optional fields are omitted rather than set to undefined (exactOptionalPropertyTypes).
export function toGeocodingResults(payload: OpenMeteoGeocoding): GeocodingResult[] {
  return (payload.results ?? []).map((hit) => ({
    id: String(hit.id),
    name: hit.name,
    country: hit.country ?? hit.country_code ?? '',
    ...(hit.country_code === undefined ? {} : { countryCode: hit.country_code }),
    ...(hit.admin1 === undefined ? {} : { admin1: hit.admin1 }),
    latitude: hit.latitude,
    longitude: hit.longitude,
    ...(hit.elevation === undefined ? {} : { elevation: hit.elevation }),
    timezone: hit.timezone,
  }));
}
