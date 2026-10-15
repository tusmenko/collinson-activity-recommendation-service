import { Injectable } from '@nestjs/common';

import { ClockPort } from '../../infra/index.js';
import { LocationService } from '../../location/index.js';
import type { LocationModel } from '../models/location.model.js';
import type { RankingsResultModel } from '../models/rankings-result.model.js';
import type { RankingsArgs } from './args.schema.js';
import { LocationRankingService } from './location-ranking.service.js';
import { RankingsResultMapper } from './rankings-result.mapper.js';

// The use cases behind the two ranking fields: by name (geocoded) and by a location already resolved.
@Injectable()
export class RankingsQueryService {
  constructor(
    private readonly locations: LocationService,
    private readonly ranker: LocationRankingService,
    private readonly mapper: RankingsResultMapper,
    private readonly clock: ClockPort,
  ) {}

  async byCity(args: RankingsArgs, requestId: string): Promise<RankingsResultModel> {
    const { location, alternatives } = await this.locations.resolve(args.city, args.country);
    const ranked = await this.ranker.rank(location, args.activities, requestId);
    return this.mapper.toResult(ranked, alternatives, this.clock.now());
  }

  // Location.rankings: the facts travel with the parent, so no geocoding and no facts read.
  async forLocation(
    location: LocationModel,
    activities: readonly string[] | undefined,
    requestId: string,
  ): Promise<RankingsResultModel> {
    const ranked = await this.ranker.rank(location.facts, activities, requestId);
    return this.mapper.toResult(ranked, [], this.clock.now());
  }
}
