import { Field, ObjectType } from '@nestjs/graphql';

import { ActivityReasonModel } from './activity-reason.model';
import { LocationModel } from './location.model';
import { DateTimeScalar } from './scalars.model';
import { SourceStatusModel } from './source-status.model';

// `reasons` is a field resolver (MetaResolver) over `unranked`, computed with the rankings.
@ObjectType('Meta', { description: 'Data age, degradation and the other places the name matched.' })
export class MetaModel {
  @Field(() => DateTimeScalar, { description: 'When the oldest served source was fetched.' })
  readonly fetchedAt!: string;

  @Field(() => Boolean, {
    description:
      'The refetch failed and stored data older than the freshness threshold was served.',
  })
  readonly stale!: boolean;

  @Field(() => Boolean, { description: 'A source failed; sources says which.' })
  readonly partial!: boolean;

  @Field(() => [SourceStatusModel])
  readonly sources!: readonly SourceStatusModel[];

  @Field(() => [LocationModel])
  readonly alternatives!: readonly LocationModel[];

  readonly unranked!: readonly ActivityReasonModel[];
}
