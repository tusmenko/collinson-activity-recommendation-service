import { Field, ObjectType } from '@nestjs/graphql';

import { ActivityRankingModel } from './activity-ranking.model';
import { LocationModel } from './location.model';
import { MetaModel } from './meta.model';

@ObjectType('RankingsResult', {
  description: 'Activity rankings for one location over the forecast window.',
})
export class RankingsResultModel {
  @Field(() => LocationModel)
  readonly location!: LocationModel;

  @Field(() => [ActivityRankingModel])
  readonly rankings!: readonly ActivityRankingModel[];

  @Field(() => MetaModel)
  readonly meta!: MetaModel;
}
