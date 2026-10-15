import { Field, ObjectType } from '@nestjs/graphql';

import type { ActivityStatus } from '../../ranking/index.js';
import { DayScoreModel } from './day-score.model.js';
import { ActivityEnum, ActivityStatusEnum } from './enums.model.js';

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
