import { describe, expect, it } from 'vitest';

import type { StoredDay, WindowRead } from '../store/store.types';
import type { DaySignals } from '../weather.types';
import { FairUseExceededError, IngestFailedError } from './ingest.errors';
import { fromRead, marineAvailabilityOf, outcomeOf, skipped } from './ingest.util';

const CALM: DaySignals = {
  date: '2026-10-15',
  tempMax: 14,
  tempMin: 6,
  precipitation: 0,
  precipitationProbability: 5,
  snowfall: 0,
  snowDepth: 0,
  windMax: 10,
  windGusts: 20,
  cloudCover: 30,
  uvIndex: 2,
  sunshineHours: 6,
  visibility: 24_000,
  weatherCode: 1,
  waveHeight: null,
  wavePeriod: null,
  swellHeight: null,
};

function read(fetchedAt: string | null, days: readonly StoredDay[] = []): WindowRead {
  return { state: 'fresh', days, fetchedAt };
}

describe('ingest helpers', () => {
  it('U-INGEST-1 a skipped source serves nothing and is not stale', () => {
    expect(skipped('MARINE')).toEqual({
      status: { source: 'MARINE', status: 'SKIPPED', fetchedAt: null },
      days: null,
      stale: false,
    });
  });

  it('U-INGEST-1 a stored window is served OK, or FAILED and stale after a failed refetch', () => {
    const day: StoredDay = {
      signals: CALM,
      fetchedAt: '2026-10-15T06:00:00.000Z',
      providerSchemaVersion: 'v1',
    };
    const window = read('2026-10-15T06:00:00.000Z', [day]);

    expect(fromRead('FORECAST', window, false)).toEqual({
      status: { source: 'FORECAST', status: 'OK', fetchedAt: '2026-10-15T06:00:00.000Z' },
      days: [CALM],
      stale: false,
    });
    expect(fromRead('FORECAST', window, true)).toMatchObject({
      status: { status: 'FAILED' },
      stale: true,
    });
  });

  it('U-EVENT-3 any wave value on any day means marine data is available', () => {
    expect(marineAvailabilityOf([CALM, { ...CALM, waveHeight: 1.2 }])).toBe('available');
    expect(marineAvailabilityOf([{ ...CALM, wavePeriod: 8 }])).toBe('available');
    expect(marineAvailabilityOf([{ ...CALM, swellHeight: 0.4 }])).toBe('available');
  });

  it('U-EVENT-3 all-null waves, or no days, mean marine data is absent', () => {
    expect(marineAvailabilityOf([CALM, CALM])).toBe('absent');
    expect(marineAvailabilityOf([])).toBe('absent');
  });

  it('I-INGEST-8 the ingest.run outcome label: the failure reason, fair-use, or error', () => {
    expect(outcomeOf(new IngestFailedError('timeout', 'took too long'))).toBe('timeout');
    expect(outcomeOf(new FairUseExceededError(10_000))).toBe('fair-use');
    expect(outcomeOf(new Error('boom'))).toBe('error');
    expect(outcomeOf('boom')).toBe('error');
  });
});
