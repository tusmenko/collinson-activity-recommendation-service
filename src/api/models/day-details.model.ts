import { Field, ObjectType } from '@nestjs/graphql';

import { DaySignalsModel } from './day-signals.model.js';
import { FactorModel } from './factor.model.js';

@ObjectType('DayDetails', { description: 'Why a day scored as it did.' })
export class DayDetailsModel {
  @Field(() => [FactorModel])
  readonly factors!: readonly FactorModel[];

  @Field(() => DaySignalsModel)
  readonly signals!: DaySignalsModel;
}
