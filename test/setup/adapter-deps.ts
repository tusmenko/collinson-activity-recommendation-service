import { pino } from 'pino';

import { loadEnv } from '../../src/infra/config/env.schema';
import { AppLogger, ConfigService, OpenMeteoClient } from '../../src/infra/index';
import type { ClockPort } from '../../src/infra/index';
import { FixedClock } from './fixed-clock';
import { testEnv } from './test-env';
import type { EnvOverrides } from './test-env';

export function testConfig(overrides: EnvOverrides = {}): ConfigService {
  return new ConfigService(loadEnv(testEnv(overrides)));
}

function silentLogger(): AppLogger {
  return new AppLogger(pino({ level: 'silent' }));
}

// The shared Open-Meteo client as the adapters receive it, silent; its outcomes are stamped FIXED_NOW.
export function openMeteoClient(
  config: ConfigService = testConfig(),
  clock: ClockPort = new FixedClock(),
): OpenMeteoClient {
  return new OpenMeteoClient(config, silentLogger(), clock);
}
