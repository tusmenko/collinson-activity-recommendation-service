import { Module } from '@nestjs/common';

import { LocationModule } from '../../location/index.js';
import { RankingModule } from '../../ranking/index.js';
import { WeatherModule } from '../../weather/index.js';
import { ErrorsModule } from '../errors/errors.module.js';
import { LocationRankingService } from './location-ranking.service.js';
import { RankingsQueryService } from './rankings-query.service.js';
import { RankingsResultMapper } from './rankings-result.mapper.js';
import { API_RESOLVERS } from './resolvers.const.js';

// ErrorsModule supplies the mapper the resolvers' error filter is built with.
@Module({
  imports: [LocationModule, WeatherModule, RankingModule, ErrorsModule],
  providers: [LocationRankingService, RankingsQueryService, RankingsResultMapper, ...API_RESOLVERS],
})
export class RankingsModule {}
