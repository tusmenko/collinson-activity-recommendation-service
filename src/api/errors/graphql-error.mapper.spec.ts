import { ThrottlerException } from '@nestjs/throttler';
import { GraphQLError } from 'graphql';
import type { GraphQLFormattedError } from 'graphql';
import { describe, expect, it } from 'vitest';

import { locationFacts } from '../../../test/setup/location-facts';
import { GeocodingUnavailableError, LocationNotFoundError } from '../../location/index';
import { UnknownActivityError } from '../../ranking/index';
import { ForecastUnavailableError } from '../../weather/index';
import { UpstreamUnavailableError } from '../api.errors';
import { GraphqlErrorMapper } from './graphql-error.mapper';

const mapper = new GraphqlErrorMapper();
const AT: GraphQLFormattedError = {
  message: 'raw message',
  locations: [{ line: 2, column: 3 }],
  path: ['activityRankings'],
};
const POSITION = { locations: AT.locations, path: AT.path };

describe('GraphqlErrorMapper', () => {
  it('U-API-5 an unknown name is NOT_FOUND with the input, keeping the position', () => {
    expect(mapper.format(AT, new LocationNotFoundError('Xyzzyqq'))).toEqual({
      ...POSITION,
      message: 'No location found for "Xyzzyqq"',
      extensions: { code: 'NOT_FOUND', input: 'Xyzzyqq' },
    });
  });

  it('U-API-5 an upstream failure with a location carries retryAfterSeconds and the location', () => {
    const formatted = mapper.format(AT, new UpstreamUnavailableError(locationFacts(), 30));

    expect(formatted.extensions).toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      retryAfterSeconds: 30,
      location: { id: '2988507', name: 'Paris', region: 'Île-de-France' },
    });
  });

  it('U-API-5 forecast and geocoding failures are UPSTREAM_UNAVAILABLE with a retry hint', () => {
    expect(mapper.format(AT, new ForecastUnavailableError(45)).extensions).toEqual({
      code: 'UPSTREAM_UNAVAILABLE',
      retryAfterSeconds: 45,
    });
    expect(mapper.format(AT, new GeocodingUnavailableError('timeout')).extensions).toEqual({
      code: 'UPSTREAM_UNAVAILABLE',
      retryAfterSeconds: 30,
    });
  });

  it('U-API-5 a throttled request is RATE_LIMITED; an unknown activity is BAD_USER_INPUT', () => {
    expect(mapper.format(AT, new ThrottlerException())).toEqual({
      ...POSITION,
      message: 'Too many requests',
      extensions: { code: 'RATE_LIMITED' },
    });
    expect(mapper.format(AT, new UnknownActivityError('KITING')).extensions).toEqual({
      code: 'BAD_USER_INPUT',
    });
  });

  it('U-API-5 a GraphQL error passes through as Apollo formatted it', () => {
    expect(mapper.format(AT, new GraphQLError('Syntax Error'))).toBe(AT);
  });

  it('U-API-5 anything else loses its detail and is INTERNAL_SERVER_ERROR', () => {
    expect(mapper.format({ message: 'secret' }, new Error('secret'))).toEqual({
      message: 'Internal server error',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });

  it('U-API-5 client errors are GraphQL errors and the mapped domain errors, nothing else', () => {
    expect(mapper.isClientError(new GraphQLError('bad'))).toBe(true);
    expect(mapper.isClientError(new LocationNotFoundError('Xyzzyqq'))).toBe(true);
    expect(mapper.isClientError(new Error('bug'))).toBe(false);
    expect(mapper.isClientError('bug')).toBe(false);
  });
});
