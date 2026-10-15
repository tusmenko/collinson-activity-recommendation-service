import { Args, Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { ActivityEnum } from '../models/enums.model';
import { LocationModel } from '../models/location.model';
import { RankingsResultModel } from '../models/rankings-result.model';
import { ActivitiesSchema } from './args.schema';
import { RankingsQueryService } from './rankings-query.service';
import { ZodArgPipe } from './zod-args.pipe';

@Resolver(() => LocationModel)
export class LocationResolver {
  constructor(private readonly rankings: RankingsQueryService) {}

  // Nullable: a failure ranking one place (an alternative's forecast fetch) is an error on this path, not the answer.
  @ResolveField('rankings', () => RankingsResultModel, {
    nullable: true,
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
