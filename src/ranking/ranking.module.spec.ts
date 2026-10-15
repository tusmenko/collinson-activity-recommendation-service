import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { testConfig } from '../../test/setup/adapter-deps';
import { ConfigModule } from '../infra/config/config.module';
import { ConfigService } from '../infra/index';
import { LoggingModule } from '../infra/logging/logging.module';
import { TelemetryModule } from '../infra/telemetry/telemetry.module';
import { RankingModule } from './ranking.module';
import { RankingService } from './ranking.service';
import { ClassifierRegistry } from './registry/classifier-registry.service';

describe('RankingModule', () => {
  it('U-RANK-2 the registry exposes the four built-in activities before any module init', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, LoggingModule, TelemetryModule, RankingModule],
    })
      .overrideProvider(ConfigService)
      .useValue(testConfig())
      .compile();
    // No init(): the registry is filled at construction, so the first read already sees every classifier.
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
