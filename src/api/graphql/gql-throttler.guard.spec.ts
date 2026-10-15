import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { describe, expect, it } from 'vitest';

import { GqlThrottlerGuard } from './gql-throttler.guard';
import type { GraphqlContext } from './graphql.types';

// Exposes the two overridden hooks; the throttling itself is the library's, covered end to end by E-API-10.
class ProbeGuard extends GqlThrottlerGuard {
  skips(context: ExecutionContext): Promise<boolean> {
    return this.shouldSkip(context);
  }

  pair(context: ExecutionContext): GraphqlContext {
    return this.getRequestResponse(context);
  }
}

const guard = new ProbeGuard({ throttlers: [] }, {} as ThrottlerStorage, new Reflector());

function context(type: string, args: unknown[] = []): ExecutionContext {
  return {
    getType: () => type,
    getArgs: () => args,
    getClass: () => ProbeGuard,
    getHandler: () => context,
  } as unknown as ExecutionContext;
}

describe('GqlThrottlerGuard', () => {
  it('U-API-8 GraphQL operations are throttled; HTTP routes such as /health are skipped', async () => {
    await expect(guard.skips(context('graphql'))).resolves.toBe(false);
    await expect(guard.skips(context('http'))).resolves.toBe(true);
  });

  it('U-API-8 the request and response come from the GraphQL context', () => {
    const gqlContext = { req: {}, res: {}, requestId: 'r-1' };

    expect(guard.pair(context('graphql', [{}, {}, gqlContext, {}]))).toBe(gqlContext);
  });
});
