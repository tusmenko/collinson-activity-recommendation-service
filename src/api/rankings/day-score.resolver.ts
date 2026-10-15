import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { DayDetailsModel } from '../models/day-details.model';
import { DayScoreModel } from '../models/day-score.model';

@Resolver(() => DayScoreModel)
export class DayScoreResolver {
  // Serialised only when selected (D-3); the classifier computed the factors for the ranking event anyway (D-7).
  @ResolveField('details', () => DayDetailsModel, {
    nullable: true,
    description: 'The factors and signals behind the score.',
  })
  details(@Parent() day: DayScoreModel): DayDetailsModel {
    return { factors: day.factors, signals: day.signals };
  }
}
