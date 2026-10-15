import { Field, Int, ObjectType } from '@nestjs/graphql';

import type { Factor } from '../../ranking/index.js';
import type { DaySignals } from '../../weather/index.js';
import { DateScalar } from './scalars.model.js';

// `details` is a field resolver (DayScoreResolver); factors and signals ride along unserialised until selected.
@ObjectType('DayScore', { description: "A dated score; ordering is the consumer's." })
export class DayScoreModel {
  @Field(() => DateScalar)
  readonly date!: string;

  @Field(() => Int, {
    nullable: true,
    description: '0 to 100; null when the activity is not applicable or unavailable.',
  })
  readonly score!: number | null;

  readonly factors!: readonly Factor[];

  readonly signals!: DaySignals;
}
