import { describe, expect, it } from 'vitest';

import { at } from './open-meteo.util';

describe('Open-Meteo shared helpers', () => {
  it('U-ADAPT-14 a series value past the end or null reads as null', () => {
    expect(at([1.5, null], 0)).toBe(1.5);
    expect(at([1.5, null], 1)).toBeNull();
    expect(at([1.5, null], 2)).toBeNull();
  });
});
