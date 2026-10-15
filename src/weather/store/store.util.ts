import type { Source } from '../weather.types';

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
