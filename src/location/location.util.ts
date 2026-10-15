import type { GeocodingResult, LocationFacts, ResolvedLocation } from './location.types.js';

export function normaliseQuery(city: string, country: string | undefined): string {
  return `${city.trim().toLowerCase()}|${country?.trim().toLowerCase() ?? ''}`;
}

export function inCountry(result: GeocodingResult, country: string): boolean {
  const wanted = country.trim().toLowerCase();
  return result.country.toLowerCase() === wanted || result.countryCode?.toLowerCase() === wanted;
}

// A-10: the first exact-name hit (case-insensitive, accents significant) beats a fuzzy first hit.
export function matchFirst(results: readonly GeocodingResult[], city: string): GeocodingResult[] {
  const wanted = city.trim().toLowerCase();
  const exact = results.find((result) => result.name.toLowerCase() === wanted);
  return exact === undefined
    ? [...results]
    : [exact, ...results.filter((result) => result !== exact)];
}

export function split(facts: readonly LocationFacts[]): ResolvedLocation | null {
  const [location, ...alternatives] = facts;
  return location === undefined ? null : { location, alternatives };
}
