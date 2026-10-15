import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';

import {
  AppLogger,
  ClockPort,
  ConfigService,
  InfraModule,
  QueueConnection,
} from '../../src/infra/index.js';
import {
  ForecastRepositoryPort,
  ForecastSourcePort,
  IngestService,
  MarineSourcePort,
  WeatherModule,
  WindowService,
} from '../../src/weather/index.js';
import type { Source } from '../../src/weather/index.js';
import { IngestQueue } from '../../src/weather/queue/ingest.queue.js';
import { testConfig } from './adapter-deps.js';
import { captureLogger } from './capture-logger.js';
import { FakeWeatherSource, templateDay } from './fakes/fake-weather-source.js';
import { ManualClock } from './fakes/manual-clock.js';
import { createTestRedis, flushQueueKeys, flushTestKeys, TEST_REDIS_URL } from './redis.js';
import type { EnvOverrides } from './test-env.js';

export interface TestLocation {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
}

export interface IngestHarness {
  readonly service: IngestService;
  readonly queue: IngestQueue;
  readonly repository: ForecastRepositoryPort;
  readonly forecast: FakeWeatherSource;
  readonly marine: FakeWeatherSource;
  readonly clock: ManualClock;
  // Prefixed client: keys read and written here match the service's view of the store.
  readonly redis: Redis;
  readonly logs: Record<string, unknown>[];
  // Writes the current window for the location with every key at full RETENTION_TTL.
  seedWindow(location: TestLocation, source: Source, fetchedAt: string): Promise<string[]>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

// The weather module as Nest wires it, processors on, with fake adapters, a manual clock and isolated keys.
export async function createIngestHarness(overrides: EnvOverrides = {}): Promise<IngestHarness> {
  const clock = new ManualClock();
  const forecast = new FakeWeatherSource('FORECAST', clock);
  const marine = new FakeWeatherSource('MARINE', clock);
  const redis = createTestRedis();
  const bullPrefix = `test-bull-${randomUUID()}`;
  const captured = captureLogger();
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [InfraModule, WeatherModule],
  })
    .overrideProvider(ConfigService)
    .useValue(testConfig(overrides))
    .overrideProvider(Redis)
    .useValue(redis)
    .overrideProvider(QueueConnection)
    .useValue(new QueueConnection(TEST_REDIS_URL, bullPrefix))
    .overrideProvider(ClockPort)
    .useValue(clock)
    .overrideProvider(AppLogger)
    .useValue(captured.logger)
    .overrideProvider(ForecastSourcePort)
    .useValue(forecast)
    .overrideProvider(MarineSourcePort)
    .useValue(marine)
    .compile();
  await moduleRef.init();

  const queue = moduleRef.get(IngestQueue);
  const repository = moduleRef.get(ForecastRepositoryPort);
  const windows = moduleRef.get(WindowService);

  return {
    service: moduleRef.get(IngestService),
    queue,
    repository,
    forecast,
    marine,
    clock,
    redis,
    logs: captured.lines,
    async seedWindow(location, source, fetchedAt) {
      const dates = windows.dates(location.timezone);
      const days = dates.map((date) => ({
        signals: templateDay(source, date),
        fetchedAt,
        providerSchemaVersion: 'fake-1',
      }));
      await repository.writeWindow(location.id, source, days, { seeded: true });
      return dates;
    },
    async reset() {
      forecast.reset();
      marine.reset();
      clock.reset();
      await queue.obliterate();
      await flushTestKeys(redis);
      captured.lines.length = 0;
    },
    async close() {
      forecast.reset();
      marine.reset();
      await queue.obliterate();
      await flushTestKeys(redis);
      // Closing the module quits the injected Redis client through RedisModule's shutdown hook.
      await moduleRef.close();
      await flushQueueKeys(bullPrefix);
    },
  };
}
