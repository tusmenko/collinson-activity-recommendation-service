import { describe, expect, it } from 'vitest';

import { minIso } from './weather.util';

describe('minIso', () => {
  it('U-INGEST-1 U-STORE-2 the oldest of the given stamps', () => {
    expect(
      minIso(['2026-10-15T06:00:00.000Z', '2026-10-14T06:00:00.000Z', '2026-10-15T05:00:00.000Z']),
    ).toBe('2026-10-14T06:00:00.000Z');
  });

  it('U-INGEST-1 U-STORE-2 null when there is no stamp', () => {
    expect(minIso([])).toBeNull();
  });
});
