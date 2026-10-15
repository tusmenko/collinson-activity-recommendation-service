import type { DaySignals } from '../weather.types.js';

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
