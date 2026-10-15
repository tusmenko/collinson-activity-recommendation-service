import { Field, ObjectType } from '@nestjs/graphql';

import { DaySignalsModel } from './day-signals.model';
import { FactorModel } from './factor.model';

@ObjectType('DayDetails', { description: 'Why a day scored as it did.' })
export class DayDetailsModel {
  @Field(() => [FactorModel])
  readonly factors!: readonly FactorModel[];

  @Field(() => DaySignalsModel)
  readonly signals!: DaySignalsModel;
}
