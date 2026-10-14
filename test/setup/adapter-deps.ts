import { pino } from 'pino';

import { loadEnv } from '../../src/infra/config/env.schema.js';
import { AppLogger, ConfigService } from '../../src/infra/index.js';
import { testEnv } from './test-env.js';
import type { EnvOverrides } from './test-env.js';

export function testConfig(overrides: EnvOverrides = {}): ConfigService {
  return new ConfigService(loadEnv(testEnv(overrides)));
}

export function silentLogger(): AppLogger {
  return new AppLogger(pino({ level: 'silent' }));
}
