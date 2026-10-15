import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { DateScalar } from './scalars.model.js';

@ObjectType('DaySignals', {
  description: 'One local day of provider-neutral weather signals; null means no value.',
})
export class DaySignalsModel {
  @Field(() => DateScalar)
  readonly date!: string;

  @Field(() => Float, { nullable: true, description: '°C' })
  readonly tempMax!: number | null;

  @Field(() => Float, { nullable: true, description: '°C' })
  readonly tempMin!: number | null;

  @Field(() => Float, { nullable: true, description: 'mm' })
  readonly precipitation!: number | null;

  @Field(() => Float, { nullable: true, description: 'percent' })
  readonly precipitationProbability!: number | null;

  @Field(() => Float, { nullable: true, description: 'cm per day' })
  readonly snowfall!: number | null;

  @Field(() => Float, { nullable: true, description: 'cm, daily maximum' })
  readonly snowDepth!: number | null;

  @Field(() => Float, { nullable: true, description: 'km/h' })
  readonly windMax!: number | null;

  @Field(() => Float, { nullable: true, description: 'km/h' })
  readonly windGusts!: number | null;

  @Field(() => Float, { nullable: true, description: 'percent' })
  readonly cloudCover!: number | null;

  @Field(() => Float, { nullable: true })
  readonly uvIndex!: number | null;

  @Field(() => Float, { nullable: true, description: 'hours' })
  readonly sunshineHours!: number | null;

  @Field(() => Float, { nullable: true, description: 'm' })
  readonly visibility!: number | null;

  @Field(() => Int, { nullable: true, description: 'WMO weather code' })
  readonly weatherCode!: number | null;

  @Field(() => Float, { nullable: true, description: 'm' })
  readonly waveHeight!: number | null;

  @Field(() => Float, { nullable: true, description: 's' })
  readonly wavePeriod!: number | null;

  @Field(() => Float, { nullable: true, description: 'm' })
  readonly swellHeight!: number | null;
}
