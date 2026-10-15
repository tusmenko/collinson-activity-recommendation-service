import type { GeocodingResult, LocationFacts, ResolvedLocation } from './location.types';

export function normaliseQuery(city: string, country: string | undefined): string {
  return `${city.trim().toLowerCase()}|${country?.trim().toLowerCase() ?? ''}`;
}

export function inCountry(result: GeocodingResult, country: string): boolean {
  const wanted = country.trim().toLowerCase();
  return result.country.toLowerCase() === wanted || result.countryCode?.toLowerCase() === wanted;
}

export function split(facts: readonly LocationFacts[]): ResolvedLocation | null {
  const [location, ...alternatives] = facts;
  return location === undefined ? null : { location, alternatives };
}
