import { Catch } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { GqlContextType, GqlExceptionFilter } from '@nestjs/graphql';
import type { Logger } from 'pino';

import { AppLogger } from '../../infra/index';
import { GraphqlErrorMapper } from './graphql-error.mapper';

// Hands every GraphQL error back to Apollo, where GraphqlErrorMapper.format gives it a code. Nest's default handler
// would log NOT_FOUND or BAD_USER_INPUT at error level; here only unexpected errors are logged, with their stack.
// Registered app-wide (APP_FILTER), so HTTP routes such as the health probes keep Nest's own handling.
@Catch()
export class GraphqlErrorFilter extends BaseExceptionFilter implements GqlExceptionFilter {
  private readonly logger: Logger;

  constructor(
    private readonly errors: GraphqlErrorMapper,
    logger: AppLogger,
  ) {
    super();
    this.logger = logger.pino.child({ component: 'GraphQL' });
  }

  override catch(exception: unknown, host: ArgumentsHost): unknown {
    if (host.getType<GqlContextType>() !== 'graphql') {
      super.catch(exception, host);
      return undefined;
    }
    if (!this.errors.isClientError(exception)) {
      this.logger.error({ err: exception }, 'unexpected error in a resolver');
    }
    return exception;
  }
}
