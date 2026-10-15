import type { WindowRead } from '../store/store.types';
import type { DaySignals, Source } from '../weather.types';
import { FairUseExceededError, IngestFailedError } from './ingest.errors';
import type { MarineAvailability, Served } from './ingest.types';

export function skipped(source: Source): Served {
  return { status: { source, status: 'SKIPPED', fetchedAt: null }, days: null, stale: false };
}

export function fromRead(source: Source, read: WindowRead, refreshFailed: boolean): Served {
  return {
    status: { source, status: refreshFailed ? 'FAILED' : 'OK', fetchedAt: read.fetchedAt },
    days: read.days.map((day) => day.signals),
    stale: refreshFailed,
  };
}

// Inland points answer with every wave value null: absence of marine data, not a failure (D-7).
export function marineAvailabilityOf(days: readonly DaySignals[]): MarineAvailability {
  const hasWaves = days.some(
    (day) => day.waveHeight !== null || day.wavePeriod !== null || day.swellHeight !== null,
  );
  return hasWaves ? 'available' : 'absent';
}

// The ingest.run log's outcome label for a job that threw.
export function outcomeOf(error: unknown): string {
  if (error instanceof IngestFailedError) {
    return error.reason;
  }
  return error instanceof FairUseExceededError ? 'fair-use' : 'error';
}
