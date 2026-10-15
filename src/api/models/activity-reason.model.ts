import { Field, ObjectType } from '@nestjs/graphql';

import { ActivityEnum } from './enums.model.js';

@ObjectType('ActivityReason', { description: 'Why an activity is not applicable or unavailable.' })
export class ActivityReasonModel {
  @Field(() => ActivityEnum)
  readonly activity!: string;

  @Field(() => String)
  readonly reason!: string;
}
