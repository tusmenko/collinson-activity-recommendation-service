import { Args, Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { ActivityEnum } from '../models/enums.model.js';
import { LocationModel } from '../models/location.model.js';
import { RankingsResultModel } from '../models/rankings-result.model.js';
import { ActivitiesSchema } from './args.schema.js';
import { RankingsQueryService } from './rankings-query.service.js';
import { ZodArgPipe } from './zod-args.pipe.js';

@Resolver(() => LocationModel)
export class LocationResolver {
  constructor(private readonly rankings: RankingsQueryService) {}

  @ResolveField('rankings', () => RankingsResultModel, {
    description:
      'Rankings for this place, for example an alternative; counts toward the location limit.',
  })
  rankingsOf(
    @Parent() location: LocationModel,
    @Args(
      'activities',
      { type: () => [ActivityEnum], nullable: true },
      new ZodArgPipe(ActivitiesSchema),
    )
    activities: string[] | undefined,
    @Context('requestId') requestId: string,
  ): Promise<RankingsResultModel> {
    return this.rankings.forLocation(location, activities, requestId);
  }
}
