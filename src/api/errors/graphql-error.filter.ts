import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import type { Logger } from 'pino';

import { AppLogger } from '../infra/index.js';
import { isClientError } from './graphql-error.mapper.js';

// Hands every error back to Apollo, where formatGraphqlError gives it a code. Nest's default handler would log
// NOT_FOUND or BAD_USER_INPUT at error level; here only unexpected errors are logged, with their stack.
@Catch()
export class GraphqlErrorFilter implements GqlExceptionFilter {
  private readonly logger: Logger;

  constructor(logger: AppLogger) {
    this.logger = logger.pino.child({ component: 'GraphQL' });
  }

  catch(exception: unknown): unknown {
    if (!isClientError(exception)) {
      this.logger.error({ err: exception }, 'unexpected error in a resolver');
    }
    return exception;
  }
}
