import { Field, ObjectType } from '@nestjs/graphql';

import type { ActivityStatus } from '../../ranking/index';
import { DayScoreModel } from './day-score.model';
import { ActivityEnum, ActivityStatusEnum } from './enums.model';

@ObjectType('ActivityRanking', {
  description: 'One activity: its status and a score per day, in date order.',
})
export class ActivityRankingModel {
  @Field(() => ActivityEnum)
  readonly activity!: string;

  @Field(() => ActivityStatusEnum)
  readonly status!: ActivityStatus;

  @Field(() => [DayScoreModel])
  readonly days!: readonly DayScoreModel[];
}
