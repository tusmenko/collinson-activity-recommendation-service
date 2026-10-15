import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { GqlContextType } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

import type { GraphqlContext } from './api.types.js';

// The inbound limit per client IP (NFR-12) on GraphQL operations; /health stays unthrottled for probes.
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected override shouldSkip(context: ExecutionContext): Promise<boolean> {
    return Promise.resolve(context.getType<GqlContextType>() !== 'graphql');
  }

  protected override getRequestResponse(context: ExecutionContext): GraphqlContext {
    return GqlExecutionContext.create(context).getContext<GraphqlContext>();
  }
}
