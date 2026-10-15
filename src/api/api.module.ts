import { Module } from '@nestjs/common';

import { ApiGraphqlModule } from './graphql/graphql.module';
import { RankingsModule } from './rankings/rankings.module';

@Module({
  imports: [ApiGraphqlModule, RankingsModule],
})
export class ApiModule {}
