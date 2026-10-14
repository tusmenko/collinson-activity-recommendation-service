import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../../src/app.module.js';
import { loadEnv } from '../../../src/infra/config/env.schema.js';
import { AppLogger, ConfigService } from '../../../src/infra/index.js';
import { testEnv } from '../../setup/test-env.js';
import type { EnvOverrides } from '../../setup/test-env.js';

export interface TestApp {
  readonly url: string;
  readonly app: INestApplication;
  close(): Promise<void>;
}

export async function createTestApp(overrides: EnvOverrides = {}): Promise<TestApp> {
  const config = new ConfigService(loadEnv(testEnv(overrides)));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(config)
    .compile();
  // Same logger as main.ts so the e2e app exercises the production logging path; LOG_LEVEL keeps it quiet.
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.useLogger(app.get(AppLogger));
  await app.listen(0, '127.0.0.1');
  return { url: await app.getUrl(), app, close: () => app.close() };
}
