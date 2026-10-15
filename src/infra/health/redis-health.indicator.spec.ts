import { HealthIndicatorService } from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { describe, expect, it, vi } from 'vitest';

import { RedisHealthIndicator } from './redis-health.indicator';

function indicator(ping: () => Promise<string>): RedisHealthIndicator {
  return new RedisHealthIndicator({ ping } as unknown as Redis, new HealthIndicatorService());
}

describe('RedisHealthIndicator', () => {
  it('U-INFRA-1 a ping that answers reports the key up', async () => {
    await expect(
      indicator(() => Promise.resolve('PONG')).isHealthy('redis'),
    ).resolves.toMatchObject({
      redis: { status: 'up' },
    });
  });

  it('U-INFRA-1 a rejected ping reports the key down with the message', async () => {
    const result = await indicator(() => Promise.reject(new Error('ECONNREFUSED'))).isHealthy(
      'redis',
    );

    expect(result).toMatchObject({ redis: { status: 'down', message: 'ECONNREFUSED' } });
  });

  it('U-INFRA-1 a ping that hangs past PING_TIMEOUT_MS reports the key down', async () => {
    vi.useFakeTimers();
    try {
      const pending = indicator(() => new Promise<string>(() => undefined)).isHealthy('redis');
      await vi.advanceTimersByTimeAsync(1_000);

      await expect(pending).resolves.toMatchObject({ redis: { status: 'down' } });
    } finally {
      vi.useRealTimers();
    }
  });
});
