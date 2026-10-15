import { Module } from '@nestjs/common';

import { LocationModule } from '../../location/index';
import { RankingModule } from '../../ranking/index';
import { WeatherModule } from '../../weather/index';
import { ErrorsModule } from '../errors/errors.module';
import { LocationRankingService } from './location-ranking.service';
import { RankingsQueryService } from './rankings-query.service';
import { RankingsResultMapper } from './rankings-result.mapper';
import { API_RESOLVERS } from './resolvers.const';

// ErrorsModule supplies the mapper the resolvers' error filter is built with.
@Module({
  imports: [LocationModule, WeatherModule, RankingModule, ErrorsModule],
  providers: [LocationRankingService, RankingsQueryService, RankingsResultMapper, ...API_RESOLVERS],
})
export class RankingsModule {}
