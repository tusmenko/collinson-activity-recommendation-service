import { Module } from '@nestjs/common';

import { ClockModule } from './clock/clock.module.js';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { RedisModule } from './redis/redis.module.js';
import { TelemetryModule } from './telemetry/telemetry.module.js';

@Module({
  imports: [ConfigModule, ClockModule, LoggingModule, TelemetryModule, RedisModule, HealthModule],
})
export class InfraModule {}
