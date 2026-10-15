import { pino } from 'pino';

import { loadEnv } from '../../src/infra/config/env.schema';
import { AppLogger, ConfigService } from '../../src/infra/index';
import { testEnv } from './test-env';
import type { EnvOverrides } from './test-env';

export function testConfig(overrides: EnvOverrides = {}): ConfigService {
  return new ConfigService(loadEnv(testEnv(overrides)));
}

export function silentLogger(): AppLogger {
  return new AppLogger(pino({ level: 'silent' }));
}
