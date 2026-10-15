import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

import type { LocationFacts } from '../../location/index.js';

// `rankings` is a field resolver (LocationResolver) that ranks these stored facts without geocoding again.
@ObjectType('Location', { description: 'A geocoded place.' })
export class LocationModel {
  @Field(() => ID)
  readonly id!: string;

  @Field(() => String)
  readonly name!: string;

  @Field(() => String, { nullable: true, description: 'First-level administrative area.' })
  readonly region!: string | null;

  @Field(() => String)
  readonly country!: string;

  @Field(() => Float)
  readonly latitude!: number;

  @Field(() => Float)
  readonly longitude!: number;

  @Field(() => String, { description: 'IANA time zone; dates are local to it.' })
  readonly timezone!: string;

  @Field(() => Float, { nullable: true, description: 'm' })
  readonly elevation!: number | null;

  readonly facts!: LocationFacts;
}
