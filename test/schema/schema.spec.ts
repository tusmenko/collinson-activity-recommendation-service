import { GRAPHQL_SDL_FILE_HEADER } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { isObjectType, parse, validate } from 'graphql';
import { describe, expect, it } from 'vitest';

import { ErrorsModule } from '../../src/api/errors/errors.module';
import { exampleTabs } from '../../src/api/graphql/examples.util';
import { GraphqlConfigService } from '../../src/api/graphql/graphql-config.service';
import { registerActivities } from '../../src/api/models/enums.model';
import { ConfigModule } from '../../src/infra/config/config.module';
import { ConfigService } from '../../src/infra/index';
import { LoggingModule } from '../../src/infra/logging/logging.module';
import { TelemetryModule } from '../../src/infra/telemetry/telemetry.module';
import { ClassifierRegistry, RankingModule } from '../../src/ranking/index';
import type { Classifier } from '../../src/ranking/index';
import { testConfig } from '../setup/adapter-deps';
import { buildSchema, enumValues } from './build-schema';

const BUILT_IN = ['SKIING', 'SURFING', 'OUTDOOR_SIGHTSEEING', 'INDOOR_SIGHTSEEING'];

function classifier(id: string): Classifier {
  return {
    id,
    version: '0.1.0',
    requires: ['FORECAST'],
    ruleFile: {},
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

  it('S-SCHEMA-1 the app wiring fills the Activity enum from the GraphQL options factory, with no module init', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, LoggingModule, TelemetryModule, RankingModule, ErrorsModule],
      providers: [GraphqlConfigService],
    })
      .overrideProvider(ConfigService)
      .useValue(testConfig())
      .compile();
    // Emptied first, so only the app's own wiring can fill it.
    registerActivities([]);

    moduleRef.get(GraphqlConfigService).createGqlOptions();
    const { schema } = await buildSchema();

    expect(enumValues(schema, 'Activity')).toEqual([...BUILT_IN].sort());
    await moduleRef.close();
  });

  it('S-SCHEMA-1 every GraphiQL example operation validates against the generated schema', async () => {
    const { schema } = await buildSchema(registryOf(BUILT_IN));

    const tabs = exampleTabs();

    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      expect(validate(schema, parse(tab.query))).toEqual([]);
    }
  });

  it('S-SCHEMA-2 registering a fake CYCLING classifier adds CYCLING to the enum', async () => {
    const { schema } = await buildSchema(registryOf([...BUILT_IN, 'CYCLING']));

    expect(enumValues(schema, 'Activity')).toEqual([...BUILT_IN, 'CYCLING'].sort());
  });

  it('S-SCHEMA-3 both activities arguments say omitted means all and an empty list is rejected', async () => {
    const { schema } = await buildSchema(registryOf(BUILT_IN));
    const argument = (type: string, field: string): string | null | undefined => {
      const owner = schema.getType(type);
      return isObjectType(owner)
        ? owner.getFields()[field]?.args.find((arg) => arg.name === 'activities')?.description
        : undefined;
    };

    for (const description of [
      argument('Query', 'activityRankings'),
      argument('Location', 'rankings'),
    ]) {
      expect(description).toMatch(/omit.*all/i);
      expect(description).toMatch(/empty list is rejected/i);
    }
  });
});
