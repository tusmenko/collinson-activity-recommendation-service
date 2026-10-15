import { UseFilters } from '@nestjs/common';
import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import { GraphqlErrorFilter } from '../errors/graphql-error.filter';
import { ActivityEnum } from '../models/enums.model';
import { RankingsResultModel } from '../models/rankings-result.model';
import { ActivitiesSchema, CitySchema, CountrySchema } from './args.schema';
import { ACTIVITIES_ARG_DESCRIPTION } from './rankings.const';
import { RankingsQueryService } from './rankings-query.service';
import { ZodArgPipe } from './zod-args.pipe';

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
      { type: () => [ActivityEnum], nullable: true, description: ACTIVITIES_ARG_DESCRIPTION },
      new ZodArgPipe(ActivitiesSchema),
    )
    activities: string[] | undefined,
    @Context('requestId') requestId: string,
  ): Promise<RankingsResultModel> {
    return this.rankings.byCity({ city, country, activities }, requestId);
  }
}
