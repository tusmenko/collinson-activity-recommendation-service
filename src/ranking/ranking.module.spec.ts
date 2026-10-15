import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { testConfig } from '../../test/setup/adapter-deps.js';
import { ConfigModule } from '../infra/config/config.module.js';
import { ConfigService } from '../infra/index.js';
import { LoggingModule } from '../infra/logging/logging.module.js';
import { TelemetryModule } from '../infra/telemetry/telemetry.module.js';
import { RankingModule } from './ranking.module.js';
import { RankingService } from './ranking.service.js';
import { ClassifierRegistry } from './registry/classifier-registry.service.js';

describe('RankingModule', () => {
  it('U-RANK-2 the registry exposes the four built-in activities', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, LoggingModule, TelemetryModule, RankingModule],
    })
      .overrideProvider(ConfigService)
      .useValue(testConfig())
      .compile();
    // Classifier modules register on init, as the app does before the GraphQL schema is built.
    await moduleRef.init();

    expect(moduleRef.get(ClassifierRegistry).ids()).toEqual([
      'SKIING',
      'SURFING',
      'OUTDOOR_SIGHTSEEING',
      'INDOOR_SIGHTSEEING',
    ]);
    expect(moduleRef.get(RankingService)).toBeInstanceOf(RankingService);
    await moduleRef.close();
  });
});
