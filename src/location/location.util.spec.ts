import { describe, expect, it } from 'vitest';

import { locationFacts } from '../../test/setup/location-facts';
import type { GeocodingResult } from './location.types';
import { inCountry, matchFirst, normaliseQuery, split } from './location.util';

function hit(name: string, overrides: Partial<GeocodingResult> = {}): GeocodingResult {
  return {
    id: name,
    name,
    country: 'Canada',
    countryCode: 'CA',
    latitude: 0,
    longitude: 0,
    timezone: 'UTC',
    ...overrides,
  };
}

describe('location helpers', () => {
  it('U-LOC-12 the geocode cache key is the trimmed, lower-cased city and country', () => {
    expect(normaliseQuery('  Paris ', ' FR ')).toBe('paris|fr');
    expect(normaliseQuery('Paris', undefined)).toBe('paris|');
  });

  it('U-LOC-12 a country matches by name or by code, ignoring case', () => {
    expect(inCountry(hit('Victoria'), ' canada ')).toBe(true);
    expect(inCountry(hit('Victoria'), 'ca')).toBe(true);
    expect(inCountry(hit('Victoria'), 'Brazil')).toBe(false);
    const { countryCode: _code, ...noCode } = hit('Victoria');
    expect(inCountry(noCode, 'CA')).toBe(false);
  });

  it('U-LOC-2 the first exact-name hit moves to the front; accents stay significant', () => {
    const fuzzy = hit('Vitória', { id: 'br' });
    const exact = hit('Victoria', { id: 'ca' });

    expect(matchFirst([fuzzy, exact], ' victoria ').map(({ id }) => id)).toEqual(['ca', 'br']);
    expect(matchFirst([fuzzy, exact], 'Vitoria').map(({ id }) => id)).toEqual(['br', 'ca']);
  });

  it('U-LOC-12 the first stored location is the match and the rest are alternatives', () => {
    const first = locationFacts({ id: '1' });
    const second = locationFacts({ id: '2' });

    expect(split([first, second])).toEqual({ location: first, alternatives: [second] });
    expect(split([])).toBeNull();
  });
});
