import { Field, ObjectType } from '@nestjs/graphql';

import type { Source, SourceStatus } from '../../weather/index';
import { FetchStatusEnum, SourceEnum } from './enums.model';
import { DateTimeScalar } from './scalars.model';

@ObjectType('SourceStatus', { description: 'How one upstream source was served for this answer.' })
export class SourceStatusModel {
  @Field(() => SourceEnum)
  readonly source!: Source;

  @Field(() => FetchStatusEnum)
  readonly status!: SourceStatus['status'];

  @Field(() => DateTimeScalar, { nullable: true })
  readonly fetchedAt!: string | null;
}
