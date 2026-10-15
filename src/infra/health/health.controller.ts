import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import type { HealthCheckResult } from '@nestjs/terminus';

import { RedisHealthIndicator } from './redis-health.indicator.js';

// Well above the idle heap of the service; a leak trips it long before the container limit.
const HEAP_LIMIT_BYTES = 512 * 1024 * 1024;

// Terminus also returns `info` and `error`, which repeat `details` split by outcome.
type HealthBody = Pick<HealthCheckResult, 'status' | 'details'>;

function bodyOf({ status, details }: HealthCheckResult): HealthBody {
  return { status, details };
}

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
      return bodyOf(
        await this.health.check([
          () => this.redis.isHealthy('redis'),
          () => this.memory.checkHeap('memory_heap', HEAP_LIMIT_BYTES),
        ]),
      );
    } catch (error) {
      // Terminus throws 503 with the full result as the body; keep the 503, trim the body.
      if (error instanceof ServiceUnavailableException) {
        throw new ServiceUnavailableException(bodyOf(error.getResponse() as HealthCheckResult));
      }
      throw error;
    }
  }
}
