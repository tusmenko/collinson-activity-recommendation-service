import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';

import { captureLogger } from '../../../test/setup/capture-logger';
import { LocationNotFoundError } from '../../location/index';
import { GraphqlErrorFilter } from './graphql-error.filter';
import { GraphqlErrorMapper } from './graphql-error.mapper';

function setup() {
  const { logger, lines } = captureLogger();
  return { filter: new GraphqlErrorFilter(new GraphqlErrorMapper(), logger), lines };
}

describe('GraphqlErrorFilter', () => {
  it('U-API-6 hands a client error back to Apollo without logging it', () => {
    const { filter, lines } = setup();
    const notFound = new LocationNotFoundError('Xyzzyqq');
    const invalid = new GraphQLError('Invalid argument');

    expect(filter.catch(notFound)).toBe(notFound);
    expect(filter.catch(invalid)).toBe(invalid);
    expect(lines).toEqual([]);
  });

  it('U-API-6 logs an unexpected error at error level with its stack, then hands it back', () => {
    const { filter, lines } = setup();
    const bug = new TypeError('undefined is not a function');

    expect(filter.catch(bug)).toBe(bug);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 50,
      component: 'GraphQL',
      msg: 'unexpected error in a resolver',
      err: { type: 'TypeError', message: 'undefined is not a function' },
    });
    expect((lines[0]?.err as { stack?: string }).stack).toContain('TypeError');
  });
});
