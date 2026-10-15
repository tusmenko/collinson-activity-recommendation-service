import { pino } from 'pino';

import { loadEnv } from '../../src/infra/config/env.schema';
import { AppLogger, ConfigService, OpenMeteoClient } from '../../src/infra/index';
import { testEnv } from './test-env';
import type { EnvOverrides } from './test-env';

export function testConfig(overrides: EnvOverrides = {}): ConfigService {
  return new ConfigService(loadEnv(testEnv(overrides)));
}

function silentLogger(): AppLogger {
  return new AppLogger(pino({ level: 'silent' }));
}

// The shared Open-Meteo client as the adapters receive it, silent.
export function openMeteoClient(config: ConfigService = testConfig()): OpenMeteoClient {
  return new OpenMeteoClient(config, silentLogger());
}
