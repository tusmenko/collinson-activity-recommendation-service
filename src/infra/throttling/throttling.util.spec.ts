import { describe, expect, it } from 'vitest';

import { toSeconds } from './throttling.util';

describe('toSeconds', () => {
  it('U-INFRA-4 rounds milliseconds up to whole seconds', () => {
    expect(toSeconds(60_000)).toBe(60);
    expect(toSeconds(1)).toBe(1);
    expect(toSeconds(1_001)).toBe(2);
  });

  it('U-INFRA-4 never goes negative: a missing or expired key reads as zero', () => {
    expect(toSeconds(0)).toBe(0);
    expect(toSeconds(-1)).toBe(0);
    expect(toSeconds(-2)).toBe(0);
  });
});
