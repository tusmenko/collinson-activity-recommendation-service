import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [ConfigModule, LoggingModule, RedisModule, HealthModule],
})
export class InfraModule {}
