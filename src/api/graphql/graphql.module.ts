import { ApolloDriver } from '@nestjs/apollo';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

import { ConfigService, RedisThrottlerStorage } from '../../infra/index';
import { RankingModule } from '../../ranking/index';
import { ErrorsModule } from '../errors/errors.module';
import { GqlThrottlerGuard } from './gql-throttler.guard';
import { GraphqlConfigService } from './graphql-config.service';
import { THROTTLE_WINDOW_MS } from './graphql.const';

// The GraphQL server and its inbound throttle. RankingModule is imported for the registry the Activity enum is built
// from; it also puts the classifier modules deeper than GraphQLModule, so they register before the schema is built.
@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [RankingModule, ErrorsModule],
      useClass: GraphqlConfigService,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (
        config: ConfigService,
        storage: RedisThrottlerStorage,
      ): ThrottlerModuleOptions => ({
        throttlers: [{ ttl: THROTTLE_WINDOW_MS, limit: config.get('INBOUND_PER_MINUTE') }],
        storage,
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: GqlThrottlerGuard }],
})
export class ApiGraphqlModule {}
