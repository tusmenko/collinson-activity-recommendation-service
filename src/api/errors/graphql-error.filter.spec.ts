import type { ArgumentsHost } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import { APP_FILTER, BaseExceptionFilter } from '@nestjs/core';
import { GraphQLError } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { captureLogger } from '../../../test/setup/capture-logger';
import { LocationNotFoundError } from '../../location/index';
import { ApiModule } from '../api.module';
import { GraphqlErrorFilter } from './graphql-error.filter';
import { GraphqlErrorMapper } from './graphql-error.mapper';

function host(type: string): ArgumentsHost {
  return { getType: () => type } as unknown as ArgumentsHost;
}

const GRAPHQL = host('graphql');

function setup() {
  const { logger, lines } = captureLogger();
  return { filter: new GraphqlErrorFilter(new GraphqlErrorMapper(), logger), lines };
}

describe('GraphqlErrorFilter', () => {
  it('U-API-6 hands a client error back to Apollo without logging it', () => {
    const { filter, lines } = setup();
    const notFound = new LocationNotFoundError('Xyzzyqq');
    const invalid = new GraphQLError('Invalid argument');

    expect(filter.catch(notFound, GRAPHQL)).toBe(notFound);
    expect(filter.catch(invalid, GRAPHQL)).toBe(invalid);
    expect(lines).toEqual([]);
  });

  it('U-API-6 logs an unexpected error at error level with its stack, then hands it back', () => {
    const { filter, lines } = setup();
    const bug = new TypeError('undefined is not a function');

    expect(filter.catch(bug, GRAPHQL)).toBe(bug);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 50,
      component: 'GraphQL',
      msg: 'unexpected error in a resolver',
      err: { type: 'TypeError', message: 'undefined is not a function' },
    });
    expect((lines[0]?.err as { stack?: string }).stack).toContain('TypeError');
  });

  it('U-API-6 an HTTP error (a health probe) goes to Nest’s own handler, untouched and unlogged', () => {
    const base = vi.spyOn(BaseExceptionFilter.prototype, 'catch').mockReturnValue(undefined);
    const { filter, lines } = setup();
    const unavailable = new ServiceUnavailableException();
    const http = host('http');

    filter.catch(unavailable, http);

    expect(base).toHaveBeenCalledWith(unavailable, http);
    expect(lines).toEqual([]);
    base.mockRestore();
  });

  it('U-API-14 the filter is registered app-wide through APP_FILTER, so every resolver is covered', () => {
    const providers = Reflect.getMetadata('providers', ApiModule) as unknown[];

    expect(providers).toContainEqual({ provide: APP_FILTER, useClass: GraphqlErrorFilter });
  });
});
