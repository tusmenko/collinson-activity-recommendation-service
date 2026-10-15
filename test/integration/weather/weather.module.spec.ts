import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ConfigService, InfraModule } from '../../../src/infra/index.js';
import {
  ForecastSourcePort,
  MarineSourcePort,
  SOURCES,
  WeatherModule,
} from '../../../src/weather/index.js';
import type { DaySignals } from '../../../src/weather/index.js';
import { testConfig } from '../../setup/adapter-deps.js';
import { createTestRedis } from '../../setup/redis.js';
import { startStubUpstream } from '../../stub-upstream/server.js';
import type { StubUpstream } from '../../stub-upstream/server.js';

const DUBAI = { latitude: 25.07725, longitude: 55.30927 };

// The module as Nest wires it: each port token resolves to its own Open-Meteo adapter.
describe('WeatherModule wiring', () => {
  let stub: StubUpstream;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    stub = await startStubUpstream(0);
    const config = testConfig({ UPSTREAM_BASE_URL: stub.url });
    moduleRef = await Test.createTestingModule({ imports: [InfraModule, WeatherModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(Redis)
      .useValue(createTestRedis())
      .compile();
  });

  afterAll(async () => {
    await moduleRef.close();
    await stub.close();
  });

  it('U-ADAPT-10 the forecast and marine tokens resolve to adapters for each source', () => {
    const sources = [
      moduleRef.get(ForecastSourcePort).source,
      moduleRef.get(MarineSourcePort).source,
    ];

    expect(sources).toEqual([...SOURCES]);
  });

  it('U-ADAPT-10 both injected adapters fetch Dubai from the stub', async () => {
    const [forecast, marine] = await Promise.all([
      moduleRef.get(ForecastSourcePort).fetchDays(DUBAI, 8),
      moduleRef.get(MarineSourcePort).fetchDays(DUBAI, 8),
    ]);

    const firstDay = (outcome: typeof forecast): DaySignals | undefined =>
      outcome.kind === 'ok' ? outcome.days[0] : undefined;
    expect(typeof firstDay(forecast)?.tempMax).toBe('number');
    expect(typeof firstDay(marine)?.waveHeight).toBe('number');
  });
});
