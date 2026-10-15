import type { WindowRead } from '../store/store.types.js';
import type { DaySignals, Source } from '../weather.types.js';
import type { MarineAvailability, Served } from './ingest.types.js';

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

export function oldestFetchedAt(served: readonly Served[]): string | null {
  const stamps = served.flatMap(({ status }) =>
    status.fetchedAt === null ? [] : [status.fetchedAt],
  );
  return stamps.length === 0 ? null : stamps.reduce((min, stamp) => (stamp < min ? stamp : min));
}

// Inland points answer with every wave value null: absence of marine data, not a failure (D-7).
export function marineAvailabilityOf(days: readonly DaySignals[]): MarineAvailability {
  const hasWaves = days.some(
    (day) => day.waveHeight !== null || day.wavePeriod !== null || day.swellHeight !== null,
  );
  return hasWaves ? 'available' : 'absent';
}
