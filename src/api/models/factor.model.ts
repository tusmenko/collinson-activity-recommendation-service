import { Field, Float, ObjectType } from '@nestjs/graphql';

import type { Effect } from '../../ranking/index';
import { EffectEnum } from './enums.model';

@ObjectType('Factor', {
  description: 'One signal that moved the score, with its value and effect.',
})
export class FactorModel {
  @Field(() => String)
  readonly signal!: string;

  @Field(() => Float, { nullable: true })
  readonly value!: number | null;

  @Field(() => String, { nullable: true })
  readonly unit!: string | null;

  @Field(() => EffectEnum)
  readonly effect!: Effect;

  @Field(() => String, { nullable: true })
  readonly note!: string | null;
}
