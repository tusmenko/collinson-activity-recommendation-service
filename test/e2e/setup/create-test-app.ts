import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';

import { AppModule } from '../../../src/app.module';
import { loadEnv } from '../../../src/infra/config/env.schema';
import { AppLogger, ClockPort, ConfigService, QueueConnection } from '../../../src/infra/index';
import { createTestRedis, flushQueueKeys, flushTestKeys, TEST_REDIS_URL } from '../../setup/redis';
import { testEnv } from '../../setup/test-env';
import type { EnvOverrides } from '../../setup/test-env';

export interface TestApp {
  readonly url: string;
  readonly app: INestApplication;
  close(): Promise<void>;
}

export interface TestAppOptions {
  // Fixes "today" so the recorded fixture dates form the window.
  readonly clock?: ClockPort;
}

// The whole app on a random port, with its store and queues under keys of its own so files and runs never share state.
export async function createTestApp(
  overrides: EnvOverrides = {},
  options: TestAppOptions = {},
): Promise<TestApp> {
  const config = new ConfigService(loadEnv(testEnv(overrides)));
  const redis = createTestRedis();
  const bullPrefix = `test-bull-${randomUUID()}`;
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(config)
    .overrideProvider(Redis)
    .useValue(redis)
    .overrideProvider(QueueConnection)
    .useValue(new QueueConnection(TEST_REDIS_URL, bullPrefix));
  const moduleRef = await (
    options.clock === undefined
      ? builder
      : builder.overrideProvider(ClockPort).useValue(options.clock)
  ).compile();
  // Same logger as main.ts so the e2e app exercises the production logging path; LOG_LEVEL keeps it quiet.
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.useLogger(app.get(AppLogger));
  await app.listen(0, '127.0.0.1');
  return {
    url: await app.getUrl(),
    app,
    async close() {
      await flushTestKeys(redis);
      // Closing the app quits the injected Redis client through RedisModule's shutdown hook.
      await app.close();
      await flushQueueKeys(bullPrefix);
    },
  };
}
