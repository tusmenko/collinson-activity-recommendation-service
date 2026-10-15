import type { Coordinates, DaySignals, Source } from '../weather.types';

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

export interface Served {
  readonly status: SourceStatus;
  // null when the source has nothing to serve.
  readonly days: readonly DaySignals[] | null;
  readonly stale: boolean;
}
