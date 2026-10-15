import { describe, expect, it } from 'vitest';

import { failureOf, toGeocodingResults } from './open-meteo-geocoding.util';

function named(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe('geocoding normalisation', () => {
  it('U-ADAPT-8 a timeout or abort is reason timeout', () => {
    expect(failureOf(named('TimeoutError', 'took too long'))).toEqual({
      kind: 'failed',
      reason: 'timeout',
      detail: 'took too long',
    });
    expect(failureOf(named('AbortError', 'aborted'))).toMatchObject({ reason: 'timeout' });
  });

  it('U-ADAPT-8 a body that is not JSON is reason malformed', () => {
    expect(failureOf(new SyntaxError('Unexpected token'))).toMatchObject({
      reason: 'malformed',
      detail: 'Unexpected token',
    });
  });

  it('U-ADAPT-8 anything else, thrown error or not, is reason network', () => {
    expect(failureOf(new TypeError('fetch failed'))).toMatchObject({
      reason: 'network',
      detail: 'fetch failed',
    });
    expect(failureOf('socket hang up')).toMatchObject({
      reason: 'network',
      detail: 'socket hang up',
    });
  });

  it('U-ADAPT-8 optional fields are omitted when the provider leaves them out', () => {
    const [result] = toGeocodingResults({
      results: [{ id: 7, name: 'Nowhere', latitude: 1, longitude: 2, timezone: 'UTC' }],
    });

    expect(result).toEqual({
      id: '7',
      name: 'Nowhere',
      country: '',
      latitude: 1,
      longitude: 2,
      timezone: 'UTC',
    });
  });

  it('U-ADAPT-8 every provided field is carried, the country name winning over the code', () => {
    const [result] = toGeocodingResults({
      results: [
        {
          id: 3,
          name: 'Victoria',
          latitude: 48.4,
          longitude: -123.4,
          elevation: 23,
          timezone: 'America/Vancouver',
          country: 'Canada',
          country_code: 'CA',
          admin1: 'British Columbia',
        },
      ],
    });

    expect(result).toEqual({
      id: '3',
      name: 'Victoria',
      country: 'Canada',
      countryCode: 'CA',
      admin1: 'British Columbia',
      latitude: 48.4,
      longitude: -123.4,
      elevation: 23,
      timezone: 'America/Vancouver',
    });
  });

  it('U-ADAPT-8 without a country name the country is the code', () => {
    const [result] = toGeocodingResults({
      results: [
        {
          id: 4,
          name: 'Lyon',
          latitude: 45.7,
          longitude: 4.8,
          timezone: 'UTC',
          country_code: 'FR',
        },
      ],
    });

    expect(result).toMatchObject({ country: 'FR', countryCode: 'FR' });
  });

  it('U-ADAPT-8 a payload without results is an empty list', () => {
    expect(toGeocodingResults({})).toEqual([]);
  });
});
