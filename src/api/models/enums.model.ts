import { registerEnumType } from '@nestjs/graphql';

// Filled from ClassifierRegistry.ids() before the schema is built (QAS-7): the field decorators hold this
// reference and Nest reads its keys only at schema build, so a registered fifth activity appears without edits here.
export const ActivityEnum: Record<string, string> = {};

export function registerActivities(ids: readonly string[]): void {
  for (const key of Object.keys(ActivityEnum)) {
    Reflect.deleteProperty(ActivityEnum, key);
  }
  for (const id of ids) {
    ActivityEnum[id] = id;
  }
}

export const ActivityStatusEnum = {
  APPLICABLE: 'APPLICABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  NO_CONDITIONS: 'NO_CONDITIONS',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;

export const SourceEnum = { FORECAST: 'FORECAST', MARINE: 'MARINE' } as const;

export const FetchStatusEnum = { OK: 'OK', FAILED: 'FAILED', SKIPPED: 'SKIPPED' } as const;

export const EffectEnum = {
  POSITIVE: 'POSITIVE',
  NEGATIVE: 'NEGATIVE',
  NEUTRAL: 'NEUTRAL',
} as const;

registerEnumType(ActivityEnum, {
  name: 'Activity',
  description: 'A ranked activity; one value per registered classifier.',
});
registerEnumType(ActivityStatusEnum, {
  name: 'ActivityStatus',
  description: 'Whether the activity can be scored at this location from the data served.',
  valuesMap: {
    APPLICABLE: { description: 'Scored for every day of the window.' },
    NOT_APPLICABLE: { description: 'The place cannot host the activity; meta.reasons says why.' },
    NO_CONDITIONS: {
      description:
        'The place can host the activity, but no day in this window has the conditions for it.',
    },
    UNAVAILABLE: { description: 'A source the activity needs failed with nothing stored.' },
  },
});
registerEnumType(SourceEnum, { name: 'Source', description: 'An upstream weather source.' });
registerEnumType(FetchStatusEnum, {
  name: 'FetchStatus',
  description: 'SKIPPED: the request did not need the source.',
});
registerEnumType(EffectEnum, { name: 'Effect', description: "A factor's effect on the score." });
