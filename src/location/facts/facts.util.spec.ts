import { describe, expect, it } from 'vitest';

import { locationFacts } from '../../../test/setup/location-facts';
import { geocodeKey, locationKey, parseFacts } from './facts.util';

describe('facts keys and parsing', () => {
  it('U-LOC-11 location facts and geocode results live under versioned keys', () => {
    expect(locationKey('2988507')).toBe('location:v1:2988507');
    expect(geocodeKey('paris|fr')).toBe('geocode:v1:paris|fr');
  });

  it('U-LOC-11 a stored value parses back to the facts; a missing one is null', () => {
    const facts = locationFacts();

    expect(parseFacts(JSON.stringify(facts))).toEqual(facts);
    expect(parseFacts(null)).toBeNull();
  });
});
