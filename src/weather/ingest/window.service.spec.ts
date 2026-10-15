import { describe, expect, it } from 'vitest';

import { testConfig } from '../../test/setup/adapter-deps.js';
import { FixedClock } from '../../test/setup/fixed-clock.js';
import { WindowService } from './window.service.js';

// 12:00Z: already the 16th in Auckland (UTC+13), still the 15th in Chicago (UTC-5).
const NOON_UTC = new Date('2026-10-15T12:00:00.000Z');

function windowAt(instant: Date): WindowService {
  return new WindowService(new FixedClock(instant), testConfig());
}

describe('WindowService', () => {
  it('I-STORE-3 the window starts at today in the location timezone', () => {
    const service = windowAt(NOON_UTC);

    expect(service.dates('Pacific/Auckland')[0]).toBe('2026-10-16');
    expect(service.dates('America/Chicago')[0]).toBe('2026-10-15');
  });

  it('I-STORE-3 the window holds WINDOW_DAYS consecutive dates across a month end', () => {
    const dates = windowAt(new Date('2026-10-28T12:00:00.000Z')).dates('UTC');

    expect(dates).toEqual([
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
  });
});
