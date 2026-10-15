import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { Redis } from 'ioredis';

import { PING_TIMEOUT_MS } from './health.const.js';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redis: Redis,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async isHealthy<const Key extends string>(key: Key): Promise<HealthIndicatorResult<Key>> {
    return this.indicator
      .check(key)
      .attempt(async () => {
        await this.redis.ping();
      })
      .withTimeout(PING_TIMEOUT_MS);
  }
}
