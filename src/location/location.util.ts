import type { GeocodingResult, LocationFacts, ResolvedLocation } from './location.types';

// The region part is appended only when given, so keys written before regions existed stay valid.
export function normaliseQuery(city: string, country: string | undefined, region?: string): string {
  const base = `${city.trim().toLowerCase()}|${country?.trim().toLowerCase() ?? ''}`;
  return region === undefined ? base : `${base}|${region.trim().toLowerCase()}`;
}

export function inCountry(result: GeocodingResult, country: string): boolean {
  const wanted = country.trim().toLowerCase();
  return result.country.toLowerCase() === wanted || result.countryCode?.toLowerCase() === wanted;
}

export function split(facts: readonly LocationFacts[]): ResolvedLocation | null {
  const [location, ...alternatives] = facts;
  return location === undefined ? null : { location, alternatives };
}
