import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { ActivityReasonModel } from '../models/activity-reason.model';
import { MetaModel } from '../models/meta.model';

@Resolver(() => MetaModel)
export class MetaResolver {
  // Serialised only when selected (D-3); the ranking computed the reasons anyway.
  @ResolveField('reasons', () => [ActivityReasonModel], {
    description: 'Why each NOT_APPLICABLE, NO_CONDITIONS or UNAVAILABLE activity has no scores.',
  })
  reasons(@Parent() meta: MetaModel): readonly ActivityReasonModel[] {
    return meta.unranked;
  }
}
