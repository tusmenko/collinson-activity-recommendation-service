import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import type { Logger } from 'pino';

import { AppLogger } from '../../infra/index.js';
import { GraphqlErrorMapper } from './graphql-error.mapper.js';

// Hands every error back to Apollo, where GraphqlErrorMapper.format gives it a code. Nest's default handler would log
// NOT_FOUND or BAD_USER_INPUT at error level; here only unexpected errors are logged, with their stack.
@Catch()
export class GraphqlErrorFilter implements GqlExceptionFilter {
  private readonly logger: Logger;

  constructor(
    private readonly errors: GraphqlErrorMapper,
    logger: AppLogger,
  ) {
    this.logger = logger.pino.child({ component: 'GraphQL' });
  }

  catch(exception: unknown): unknown {
    if (!this.errors.isClientError(exception)) {
      this.logger.error({ err: exception }, 'unexpected error in a resolver');
    }
    return exception;
  }
}
