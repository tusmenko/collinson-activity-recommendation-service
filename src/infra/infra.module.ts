import { Module } from '@nestjs/common';

import { ClockModule } from './clock/clock.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { OpenMeteoModule } from './open-meteo/open-meteo.module';
import { RedisModule } from './redis/redis.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { ThrottlingModule } from './throttling/throttling.module';

@Module({
  imports: [
    ConfigModule,
    ClockModule,
    LoggingModule,
    TelemetryModule,
    RedisModule,
    OpenMeteoModule,
    ThrottlingModule,
    HealthModule,
  ],
})
export class InfraModule {}
