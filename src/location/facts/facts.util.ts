import type { LocationFacts } from '../location.types.js';

export function locationKey(id: string): string {
  return `location:v1:${id}`;
}

export function geocodeKey(normalisedQuery: string): string {
  return `geocode:v1:${normalisedQuery}`;
}

// Values are written only by this repository, so they are trusted on read.
export function parseFacts(value: string | null): LocationFacts | null {
  return value === null ? null : (JSON.parse(value) as LocationFacts);
}
