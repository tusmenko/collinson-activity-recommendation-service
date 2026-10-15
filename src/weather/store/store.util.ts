import type { Source } from '../weather.types.js';
import type { StoredDay } from './store.types.js';

export function dayKey(locationId: string, source: Source, date: string): string {
  return `forecast:v1:${locationId}:${source}:${date}`;
}

export function rawKey(locationId: string, source: Source): string {
  return `forecast:raw:${locationId}:${source}`;
}

export function lastErrorKey(locationId: string): string {
  return `ingest:last-error:${locationId}`;
}

export function counterKey(date: string): string {
  return `fairuse:day:${date}`;
}

// ISO 8601 strings in UTC compare correctly as text.
export function oldest(days: readonly StoredDay[]): string | null {
  return days.reduce<string | null>(
    (min, day) => (min === null || day.fetchedAt < min ? day.fetchedAt : min),
    null,
  );
}
