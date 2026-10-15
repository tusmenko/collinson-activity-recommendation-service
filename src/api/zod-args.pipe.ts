import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import type { z } from 'zod';

import { ERROR_CODES } from './api.const.js';

// Validates one GraphQL argument with a Zod schema; a failure is BAD_USER_INPUT with the issues (design D-1).
export class ZodArgPipe<Output> implements PipeTransform<unknown, Output> {
  constructor(private readonly schema: z.ZodType<Output>) {}

  transform(value: unknown, metadata: ArgumentMetadata): Output {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    const issues = result.error.issues.map(({ code, message, path }) => ({ code, message, path }));
    throw new GraphQLError(`Invalid argument "${metadata.data ?? 'input'}"`, {
      extensions: { code: ERROR_CODES.badUserInput, issues },
    });
  }
}
