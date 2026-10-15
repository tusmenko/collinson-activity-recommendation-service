import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import type { HealthCheckResult } from '@nestjs/terminus';

import { HEAP_LIMIT_BYTES } from './health.const';
import type { HealthBody } from './health.types';
import { RedisHealthIndicator } from './redis-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthBody> {
    try {
      return this.body(
        await this.health.check([
          () => this.redis.isHealthy('redis'),
          () => this.memory.checkHeap('memory_heap', HEAP_LIMIT_BYTES),
        ]),
      );
    } catch (error) {
      // Terminus throws 503 with the full result as the body; keep the 503, trim the body. Any other 503 is not ours.
      if (error instanceof ServiceUnavailableException) {
        const response = error.getResponse();
        if (this.isResult(response)) {
          throw new ServiceUnavailableException(this.body(response));
        }
      }
      throw error;
    }
  }

  private isResult(body: unknown): body is HealthCheckResult {
    return typeof body === 'object' && body !== null && 'details' in body;
  }

  private body({ status, details }: HealthCheckResult): HealthBody {
    return { status, details };
  }
}
