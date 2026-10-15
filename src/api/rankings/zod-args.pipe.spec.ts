import { GraphQLError } from 'graphql';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { ZodArgPipe } from './zod-args.pipe';

const pipe = new ZodArgPipe(z.string().trim().min(1));

function rejection(value: unknown, data?: string): GraphQLError {
  try {
    pipe.transform(value, { type: 'body', ...(data === undefined ? {} : { data }) });
  } catch (error) {
    if (error instanceof GraphQLError) {
      return error;
    }
  }
  throw new Error('expected a GraphQLError');
}

describe('ZodArgPipe', () => {
  it('U-API-2 a valid argument comes back parsed', () => {
    expect(pipe.transform('  Paris ', { type: 'body', data: 'city' })).toBe('Paris');
  });

  it('U-API-1 an invalid argument is BAD_USER_INPUT naming the argument and listing the issues', () => {
    const error = rejection('   ', 'city');

    expect(error.message).toBe('Invalid argument "city"');
    expect(error.extensions).toMatchObject({
      code: 'BAD_USER_INPUT',
      issues: [{ code: 'too_small', path: [] }],
    });
  });

  it('U-API-1 an unnamed argument is called input', () => {
    expect(rejection(42).message).toBe('Invalid argument "input"');
  });
});
