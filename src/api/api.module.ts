import { ApolloDriver } from '@nestjs/apollo';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

import { ConfigService, RedisThrottlerStorage } from '../infra/index.js';
import { LocationModule } from '../location/index.js';
import { RankingModule } from '../ranking/index.js';
import { WeatherModule } from '../weather/index.js';
import { THROTTLE_WINDOW_MS } from './api.const.js';
import { GqlThrottlerGuard } from './gql-throttler.guard.js';
import { GraphqlConfigService } from './graphql-config.service.js';
import { LocationRankingService } from './location-ranking.service.js';
import { RankingsQueryService } from './rankings-query.service.js';
import { API_RESOLVERS } from './resolvers.const.js';

@Module({
  imports: [
    LocationModule,
    WeatherModule,
    RankingModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [RankingModule],
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
  providers: [
    LocationRankingService,
    RankingsQueryService,
    ...API_RESOLVERS,
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
  ],
})
export class ApiModule {}
