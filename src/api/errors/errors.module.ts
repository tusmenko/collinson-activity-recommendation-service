import { Module } from '@nestjs/common';

import { GraphqlErrorMapper } from './graphql-error.mapper';

@Module({
  providers: [GraphqlErrorMapper],
  exports: [GraphqlErrorMapper],
})
export class ErrorsModule {}
