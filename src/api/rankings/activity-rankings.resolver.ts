import { UseFilters } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import { GraphqlErrorFilter } from '../errors/graphql-error.filter.js';
import { ActivityEnum } from '../models/enums.model.js';
import { RankingsResultModel } from '../models/rankings-result.model.js';
import { ActivitiesSchema, CitySchema, CountrySchema } from './args.schema.js';
import { RankingsQueryService } from './rankings-query.service.js';
import { ZodArgPipe } from './zod-args.pipe.js';

@Resolver(() => RankingsResultModel)
@UseFilters(GraphqlErrorFilter)
export class ActivityRankingsResolver {
  constructor(private readonly rankings: RankingsQueryService) {}

  @Query(() => RankingsResultModel, {
    description: 'Rank activities for a place over the next days; omit activities for all of them.',
  })
  activityRankings(
    @Args('city', { type: () => String }, new ZodArgPipe(CitySchema)) city: string,
    @Args('country', { type: () => String, nullable: true }, new ZodArgPipe(CountrySchema))
    country: string | undefined,
    @Args(
      'activities',
      { type: () => [ActivityEnum], nullable: true },
      new ZodArgPipe(ActivitiesSchema),
    )
    activities: string[] | undefined,
    @Context('requestId') requestId: string,
  ): Promise<RankingsResultModel> {
    return this.rankings.byCity({ city, country, activities }, requestId);
  }
}
