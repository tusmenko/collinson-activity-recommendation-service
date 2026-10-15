import { describe, expect, it } from 'vitest';

import { SystemClock } from './system-clock.service';

describe('SystemClock', () => {
  it('U-INFRA-3 now() returns the wall-clock time', () => {
    const before = Date.now();

    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
