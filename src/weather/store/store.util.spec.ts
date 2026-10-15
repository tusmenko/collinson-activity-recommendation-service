import { describe, expect, it } from 'vitest';

import type { DaySignals } from '../weather.types';
import type { StoredDay } from './store.types';
import { counterKey, dayKey, lastErrorKey, oldest, rawKey } from './store.util';

const SIGNALS = { date: '2026-10-15' } as DaySignals;

function stored(fetchedAt: string): StoredDay {
  return { signals: SIGNALS, fetchedAt, providerSchemaVersion: 'v1' };
}

describe('store helpers', () => {
  it('U-STORE-1 forecast, raw, last-error and fair-use keys follow design D-4', () => {
    expect(dayKey('2988507', 'FORECAST', '2026-10-15')).toBe(
      'forecast:v1:2988507:FORECAST:2026-10-15',
    );
    expect(rawKey('2988507', 'MARINE')).toBe('forecast:raw:2988507:MARINE');
    expect(lastErrorKey('2988507')).toBe('ingest:last-error:2988507');
    expect(counterKey('2026-10-15')).toBe('fairuse:day:2026-10-15');
  });

  it('U-STORE-2 the oldest fetchedAt of the present days; null when none is present', () => {
    const days = [
      stored('2026-10-15T06:00:00.000Z'),
      stored('2026-10-14T06:00:00.000Z'),
      stored('2026-10-15T07:00:00.000Z'),
    ];

    expect(oldest(days)).toBe('2026-10-14T06:00:00.000Z');
    expect(oldest([])).toBeNull();
  });
});
