import type { GeocodingPayload } from '../../infra/index';
import type { GeocodingResult } from '../location.types';

// Optional fields are omitted rather than set to undefined (exactOptionalPropertyTypes).
export function toGeocodingResults(payload: GeocodingPayload): GeocodingResult[] {
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
