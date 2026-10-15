import { describe, expect, it } from 'vitest';

import { locationFacts } from '../../test/setup/location-facts';
import type { GeocodingResult } from './location.types';
import { countryCodeOf, inCountry, normaliseQuery, split } from './location.util';

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

  it('U-LOC-15 the cache key ignores accents, case and runs of spaces in every part', () => {
    expect(normaliseQuery('Las Américas', undefined)).toBe(
      normaliseQuery(' las  americas ', undefined),
    );
    expect(normaliseQuery('São  Paulo', 'Brasil', 'São Paulo')).toBe('sao paulo|brasil|sao paulo');
    expect(normaliseQuery('Zürich', 'CH', ' Zürich ')).toBe('zurich|ch|zurich');
  });

  it('U-LOC-12 a country name matches ignoring case and surrounding spaces', () => {
    expect(inCountry(hit('Victoria'), ' canada ')).toBe(true);
    expect(inCountry(hit('Victoria'), 'Brazil')).toBe(false);
  });

  it('U-LOC-14 exactly two letters read as an upper-case country code; anything else is a name', () => {
    expect(countryCodeOf(' ca ')).toBe('CA');
    expect(countryCodeOf('US')).toBe('US');
    expect(countryCodeOf('USA')).toBeUndefined();
    expect(countryCodeOf('Canada')).toBeUndefined();
    expect(countryCodeOf('Ü1')).toBeUndefined();
    expect(countryCodeOf(undefined)).toBeUndefined();
  });

  it('U-LOC-12 the first stored location is the match and the rest are alternatives', () => {
    const first = locationFacts({ id: '1' });
    const second = locationFacts({ id: '2' });

    expect(split([first, second])).toEqual({ location: first, alternatives: [second] });
    expect(split([])).toBeNull();
  });
});
