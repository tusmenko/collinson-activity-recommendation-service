import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ErrorsModule } from './errors/errors.module';
import { GraphqlErrorFilter } from './errors/graphql-error.filter';
import { ApiGraphqlModule } from './graphql/graphql.module';
import { RankingsModule } from './rankings/rankings.module';

// The error filter covers every resolver, field resolvers included (Location.rankings), not one class.
@Module({
  imports: [ApiGraphqlModule, RankingsModule, ErrorsModule],
  providers: [{ provide: APP_FILTER, useClass: GraphqlErrorFilter }],
})
export class ApiModule {}
