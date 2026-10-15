import { ServiceUnavailableException } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import type { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { describe, expect, it } from 'vitest';

import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';

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

    const result = await controller.ready();

    expect(result).toMatchObject({ status: 'ok', details: { redis: { status: 'up' } } });
    expect(Object.keys(result).sort()).toEqual(['details', 'status']);
  });

  it('U-INFRA-1 reports Redis down and status error when ping rejects', async () => {
    const controller = await controllerWithPing(() => Promise.reject(new Error('ECONNREFUSED')));

    const failure: unknown = await controller.ready().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    const body = (failure as ServiceUnavailableException).getResponse();
    expect(body).toMatchObject({
      status: 'error',
      details: { redis: { status: 'down', message: 'ECONNREFUSED' } },
    });
    expect(Object.keys(body).sort()).toEqual(['details', 'status']);
  });

  it('U-INFRA-1 live stays ok while Redis is down, with no dependency checked', async () => {
    const controller = await controllerWithPing(() => Promise.reject(new Error('ECONNREFUSED')));

    expect(controller.live()).toEqual({ status: 'ok', details: {} });
  });

  it('U-INFRA-1 an error other than the 503 propagates unchanged', async () => {
    const boom = new Error('terminus bug');
    const health = { check: () => Promise.reject(boom) } as unknown as HealthCheckService;
    const controller = new HealthController(
      health,
      {} as RedisHealthIndicator,
      {} as MemoryHealthIndicator,
    );

    await expect(controller.ready()).rejects.toBe(boom);
  });

  it('U-INFRA-1 a 503 that is not a Terminus result propagates unchanged', async () => {
    const plain = new ServiceUnavailableException('draining');
    const health = { check: () => Promise.reject(plain) } as unknown as HealthCheckService;
    const controller = new HealthController(
      health,
      {} as RedisHealthIndicator,
      {} as MemoryHealthIndicator,
    );

    await expect(controller.ready()).rejects.toBe(plain);
  });
});
