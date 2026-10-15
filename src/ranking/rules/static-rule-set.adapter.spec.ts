import { describe, expect, it } from 'vitest';

import { InvalidRuleSetError, UnknownActivityError } from '../ranking.errors';
import { StaticRuleSetAdapter } from './static-rule-set.adapter';

const VALID = {
  version: '2.1.0',
  factors: [
    { signal: 'windMax', unit: 'km/h', weight: 1, good: [{ lt: 20 }], poor: [], note: 'calm' },
  ],
};

describe('StaticRuleSetAdapter', () => {
  it('U-RULES-1 the version lists all four built-in rule files with their versions', () => {
    const provider = new StaticRuleSetAdapter();

    expect(provider.version).toBe(
      'v1+SKIING@1.1.0+SURFING@1.0.0+OUTDOOR_SIGHTSEEING@1.0.0+INDOOR_SIGHTSEEING@1.0.0',
    );
  });

  it('U-RULES-1 every built-in rule set loads, and every factor carries a note', () => {
    const provider = new StaticRuleSetAdapter();

    for (const activity of ['SKIING', 'SURFING', 'OUTDOOR_SIGHTSEEING', 'INDOOR_SIGHTSEEING']) {
      const notes = provider.get(activity).factors.map((factor) => factor.note);
      expect(notes.every((note) => note.length > 0)).toBe(true);
    }
  });

  it('U-RULES-1 a supplied file set is versioned from its own files', () => {
    const provider = new StaticRuleSetAdapter({ CYCLING: VALID });

    expect(provider.version).toBe('v1+CYCLING@2.1.0');
    expect(provider.get('CYCLING').factors[0]?.signal).toBe('windMax');
  });

  it('U-RULES-2 a rule naming an unknown signal is rejected at construction, naming the activity', () => {
    const invalid = { ...VALID, factors: [{ ...VALID.factors[0], signal: 'snowHeight' }] };

    const build = (): StaticRuleSetAdapter => new StaticRuleSetAdapter({ SKIING: invalid });

    expect(build).toThrow(InvalidRuleSetError);
    expect(build).toThrow(/SKIING/);
  });

  it('U-RULES-2 a rule without a note is rejected at construction', () => {
    const invalid = { ...VALID, factors: [{ ...VALID.factors[0], note: '' }] };

    expect(() => new StaticRuleSetAdapter({ SURFING: invalid })).toThrow(/SURFING/);
  });

  it('U-RANK-9 an activity with no rule file throws UnknownActivityError', () => {
    const provider = new StaticRuleSetAdapter({ CYCLING: VALID });

    expect(() => provider.get('SKIING')).toThrow(UnknownActivityError);
  });
});
