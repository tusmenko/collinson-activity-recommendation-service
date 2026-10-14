import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { Redis } from 'ioredis';

// Below the compose and Docker healthcheck timeouts so a hung Redis reports down instead of timing out the probe.
const PING_TIMEOUT_MS = 1_000;

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
