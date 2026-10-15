import { Module } from '@nestjs/common';

import { ApiGraphqlModule } from './graphql/graphql.module.js';
import { RankingsModule } from './rankings/rankings.module.js';

@Module({
  imports: [ApiGraphqlModule, RankingsModule],
})
export class ApiModule {}
