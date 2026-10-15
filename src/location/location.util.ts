import type { GeocodingResult, LocationFacts, ResolvedLocation } from './location.types';

// The region part is appended only when given, so keys written before regions existed stay valid.
export function normaliseQuery(city: string, country: string | undefined, region?: string): string {
  const base = `${city.trim().toLowerCase()}|${country?.trim().toLowerCase() ?? ''}`;
  return region === undefined ? base : `${base}|${region.trim().toLowerCase()}`;
}

// Exactly two letters reads as an ISO 3166-1 alpha-2 code; anything longer is a country name.
export function countryCodeOf(country: string | undefined): string | undefined {
  const trimmed = country?.trim() ?? '';
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : undefined;
}

// A country name; a two-letter code goes to the provider instead (countryCodeOf).
export function inCountry(result: GeocodingResult, country: string): boolean {
  return result.country.toLowerCase() === country.trim().toLowerCase();
}

export function split(facts: readonly LocationFacts[]): ResolvedLocation | null {
  const [location, ...alternatives] = facts;
  return location === undefined ? null : { location, alternatives };
}
