import { GRAPHQL_SDL_FILE_HEADER } from '@nestjs/graphql';
import { describe, expect, it } from 'vitest';

import { ClassifierRegistry } from '../../src/ranking/index';
import type { Classifier } from '../../src/ranking/index';
import { buildSchema, enumValues } from './build-schema';

const BUILT_IN = ['SKIING', 'SURFING', 'OUTDOOR_SIGHTSEEING', 'INDOOR_SIGHTSEEING'];

function classifier(id: string): Classifier {
  return {
    id,
    version: '0.1.0',
    requires: ['FORECAST'],
    score: () => Promise.resolve({ status: 'APPLICABLE', days: [] }),
  };
}

function registryOf(ids: readonly string[]): ClassifierRegistry {
  const registry = new ClassifierRegistry();
  for (const id of ids) {
    registry.register(classifier(id));
  }
  return registry;
}

describe('S-SCHEMA generated schema', () => {
  it('S-SCHEMA-1 the generated SDL matches the committed schema.gql', async () => {
    const { sdl } = await buildSchema(registryOf(BUILT_IN));

    await expect(`${GRAPHQL_SDL_FILE_HEADER}${sdl}\n`).toMatchFileSnapshot('../../schema.gql');
  });

  it('S-SCHEMA-1 the Activity enum has the four built-in values', async () => {
    const { schema } = await buildSchema(registryOf(BUILT_IN));

    expect(enumValues(schema, 'Activity')).toEqual([...BUILT_IN].sort());
  });

  it('S-SCHEMA-2 registering a fake CYCLING classifier adds CYCLING to the enum', async () => {
    const { schema } = await buildSchema(registryOf([...BUILT_IN, 'CYCLING']));

    expect(enumValues(schema, 'Activity')).toEqual([...BUILT_IN, 'CYCLING'].sort());
  });
});
