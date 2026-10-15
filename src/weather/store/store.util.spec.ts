import { describe, expect, it } from 'vitest';

import { counterKey, dayKey, lastErrorKey, rawKey } from './store.util';

describe('store helpers', () => {
  it('U-STORE-1 forecast, raw, last-error and fair-use keys follow design D-4', () => {
    expect(dayKey('2988507', 'FORECAST', '2026-10-15')).toBe(
      'forecast:v1:2988507:FORECAST:2026-10-15',
    );
    expect(rawKey('2988507', 'MARINE')).toBe('forecast:raw:2988507:MARINE');
    expect(lastErrorKey('2988507')).toBe('ingest:last-error:2988507');
    expect(counterKey('2026-10-15')).toBe('fairuse:day:2026-10-15');
  });
});
