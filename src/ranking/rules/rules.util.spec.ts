import { describe, expect, it } from 'vitest';

import { InvalidRuleSetError } from '../ranking.errors';
import { parseRuleSet } from './rules.util';

const VALID = {
  version: '1.0.0',
  factors: [
    { signal: 'tempMax', unit: '°C', weight: 1, good: [{ gte: 15 }], poor: [], note: 'warmth' },
  ],
};

describe('parseRuleSet', () => {
  it('U-RULES-1 a file that passes the schema comes back typed', () => {
    expect(parseRuleSet('OUTDOOR_SIGHTSEEING', VALID)).toEqual(VALID);
  });

  it('U-RULES-2 a file that fails the schema throws InvalidRuleSetError naming the activity', () => {
    const empty = { version: '1.0.0', factors: [] };

    expect(() => parseRuleSet('OUTDOOR_SIGHTSEEING', empty)).toThrow(InvalidRuleSetError);
    expect(() => parseRuleSet('OUTDOOR_SIGHTSEEING', empty)).toThrow(
      /^Invalid rule set for OUTDOOR_SIGHTSEEING: /,
    );
  });

  it('U-RULES-2 a band without any bound is rejected', () => {
    const unbounded = { ...VALID, factors: [{ ...VALID.factors[0], good: [{}] }] };

    expect(() => parseRuleSet('OUTDOOR_SIGHTSEEING', unbounded)).toThrow(InvalidRuleSetError);
  });
});
