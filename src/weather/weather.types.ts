import type { SOURCES } from './weather.const.js';

export type Source = (typeof SOURCES)[number];

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

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

// One day under forecast:v1:{locationId}:{source}:{date} (design D-4).
export interface StoredDay {
  readonly signals: DaySignals;
  // ISO 8601.
  readonly fetchedAt: string;
  readonly providerSchemaVersion: string;
}

// fresh: every date present and above the freshness threshold; stale: present but one is older;
// missing: at least one date absent.
export type WindowState = 'fresh' | 'stale' | 'missing';

export interface WindowRead {
  readonly state: WindowState;
  // Present dates only, in the requested order.
  readonly days: readonly StoredDay[];
  // Oldest fetchedAt among the present days; null when none is present.
  readonly fetchedAt: string | null;
}

// Kept under ingest:last-error:{locationId} for seven days.
export interface LastIngestError {
  readonly step: string;
  readonly error: string;
  // ISO 8601.
  readonly at: string;
}

export interface IngestJobData {
  readonly locationId: string;
  readonly source: Source;
  readonly coordinates: Coordinates;
}

export type IngestJobResult =
  | { readonly kind: 'completed' }
  | { readonly kind: 'failed'; readonly reason: string }
  // The bound expired while the job was still queued or running; it keeps going.
  | { readonly kind: 'timed-out' };

export interface EnsureLocation extends Coordinates {
  readonly id: string;
  // IANA zone; the window's dates are local to it.
  readonly timezone: string;
}

export interface SourceStatus {
  readonly source: Source;
  // SKIPPED: the request did not need this source.
  readonly status: 'OK' | 'FAILED' | 'SKIPPED';
  readonly fetchedAt: string | null;
}

// Derived from the served marine window; location owns the stored fact, so the caller writes it (D-7).
export type MarineAvailability = 'available' | 'absent';

export interface EnsureResult {
  // Oldest fetchedAt across the served sources.
  readonly fetchedAt: string | null;
  // A source was served from stored data after its refetch failed or the bound expired.
  readonly stale: boolean;
  // MARINE was requested and has no days to serve.
  readonly partial: boolean;
  // Every source, in SOURCES order.
  readonly sources: readonly SourceStatus[];
  readonly days: Readonly<Partial<Record<Source, readonly DaySignals[]>>>;
  // Present when MARINE days are served.
  readonly marineAvailability?: MarineAvailability;
}
