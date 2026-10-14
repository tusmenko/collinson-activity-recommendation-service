import { ServiceUnavailableException } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { describe, expect, it } from 'vitest';

import { HealthController } from './health.controller.js';
import { RedisHealthIndicator } from './redis-health.indicator.js';

async function controllerWithPing(ping: () => Promise<string>): Promise<HealthController> {
  const moduleRef = await Test.createTestingModule({
    imports: [TerminusModule.forRoot({ logger: false })],
    controllers: [HealthController],
    providers: [RedisHealthIndicator, { provide: Redis, useValue: { ping } }],
  }).compile();
  return moduleRef.get(HealthController);
}

describe('U-INFRA-1 health check', () => {
  it('U-INFRA-1 reports status ok when Redis answers ping', async () => {
    const controller = await controllerWithPing(() => Promise.resolve('PONG'));

    const result = await controller.check();

    expect(result).toMatchObject({ status: 'ok', info: { redis: { status: 'up' } } });
  });

  it('U-INFRA-1 reports Redis down and status error when ping rejects', async () => {
    const controller = await controllerWithPing(() => Promise.reject(new Error('ECONNREFUSED')));

    const failure: unknown = await controller.check().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect((failure as ServiceUnavailableException).getResponse()).toMatchObject({
      status: 'error',
      error: { redis: { status: 'down', message: 'ECONNREFUSED' } },
    });
  });
});
