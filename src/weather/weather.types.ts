import type { SOURCES } from './weather.const';

// Declared once, by the provider client in infra; the weather feature names it as its own.
export type { Coordinates } from '../infra/index';

export type Source = (typeof SOURCES)[number];

// One local day of provider-neutral signals (design D-3); null means the source has no value.
export interface DaySignals {
  // YYYY-MM-DD in the location's own timezone.
  readonly date: string;
  // °C
  readonly tempMax: number | null;
  readonly tempMin: number | null;
  // mm
  readonly precipitation: number | null;
  // %
  readonly precipitationProbability: number | null;
  // cm per day
  readonly snowfall: number | null;
  // cm, daily maximum of the hourly snow depth
  readonly snowDepth: number | null;
  // km/h
  readonly windMax: number | null;
  readonly windGusts: number | null;
  // %
  readonly cloudCover: number | null;
  readonly uvIndex: number | null;
  readonly sunshineHours: number | null;
  // m
  readonly visibility: number | null;
  // WMO code
  readonly weatherCode: number | null;
  // m
  readonly waveHeight: number | null;
  // s
  readonly wavePeriod: number | null;
  // m
  readonly swellHeight: number | null;
}

type FetchFailureReason = 'timeout' | 'http' | 'malformed' | 'network';

export type SourceFetchOutcome =
  | {
      readonly kind: 'ok';
      readonly days: DaySignals[];
      readonly raw: unknown;
      readonly providerSchemaVersion: string;
      // ISO 8601.
      readonly fetchedAt: string;
    }
  | {
      readonly kind: 'failed';
      readonly reason: FetchFailureReason;
      readonly detail: string;
      // The body when one was received, kept for replay and drift checks (D-8).
      readonly raw?: unknown;
    };
