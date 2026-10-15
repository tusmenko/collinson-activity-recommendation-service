import { Args, Context, Query, Resolver } from '@nestjs/graphql';

import { ActivityEnum } from '../models/enums.model';
import { RankingsResultModel } from '../models/rankings-result.model';
import { ActivitiesSchema, CitySchema, CountrySchema, RegionSchema } from './args.schema';
import { ACTIVITIES_ARG_DESCRIPTION, REGION_ARG_DESCRIPTION } from './rankings.const';
import { RankingsQueryService } from './rankings-query.service';
import { ZodArgPipe } from './zod-args.pipe';

@Resolver(() => RankingsResultModel)
export class ActivityRankingsResolver {
  constructor(private readonly rankings: RankingsQueryService) {}

  // eslint-disable-next-line max-params -- one decorated parameter per GraphQL argument, each with its own Zod pipe
  @Query(() => RankingsResultModel, {
    description: 'Rank activities for a place over the next days; omit activities for all of them.',
  })
  activityRankings(
    @Args('city', { type: () => String }, new ZodArgPipe(CitySchema)) city: string,
    @Args('country', { type: () => String, nullable: true }, new ZodArgPipe(CountrySchema))
    country: string | undefined,
    @Args(
      'region',
      { type: () => String, nullable: true, description: REGION_ARG_DESCRIPTION },
      new ZodArgPipe(RegionSchema),
    )
    region: string | undefined,
    @Args(
      'activities',
      { type: () => [ActivityEnum], nullable: true, description: ACTIVITIES_ARG_DESCRIPTION },
      new ZodArgPipe(ActivitiesSchema),
    )
    activities: string[] | undefined,
    @Context('requestId') requestId: string,
  ): Promise<RankingsResultModel> {
    return this.rankings.byCity({ city, country, region, activities }, requestId);
  }
}
