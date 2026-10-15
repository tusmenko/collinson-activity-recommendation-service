import type { Redis } from 'ioredis';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureLogger } from '../../../test/setup/capture-logger';
import { REDIS_QUIT_TIMEOUT_MS } from './redis.const';
import { RedisModule } from './redis.module';

function client(status: string, quit: () => Promise<unknown>) {
  const fake = { status, quit: vi.fn(quit), disconnect: vi.fn() };
  return { fake, redis: fake as unknown as Redis };
}

describe('RedisModule shutdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('U-INFRA-8 a ready client quits gracefully', async () => {
    const { fake, redis } = client('ready', () => Promise.resolve('OK'));

    await new RedisModule(redis, captureLogger().logger).onApplicationShutdown();

    expect(fake.quit).toHaveBeenCalledOnce();
    expect(fake.disconnect).not.toHaveBeenCalled();
  });

  it('U-INFRA-8 a client that never connected is disconnected without a QUIT', async () => {
    const { fake, redis } = client('reconnecting', () => new Promise(() => undefined));

    await new RedisModule(redis, captureLogger().logger).onApplicationShutdown();

    expect(fake.quit).not.toHaveBeenCalled();
    expect(fake.disconnect).toHaveBeenCalledOnce();
  });

  it('U-INFRA-8 a QUIT that never answers is cut off after REDIS_QUIT_TIMEOUT_MS with a warning', async () => {
    vi.useFakeTimers();
    const captured = captureLogger();
    const { fake, redis } = client('ready', () => new Promise(() => undefined));

    const shutdown = new RedisModule(redis, captured.logger).onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(REDIS_QUIT_TIMEOUT_MS);
    await shutdown;

    expect(fake.disconnect).toHaveBeenCalledOnce();
    expect(captured.lines).toContainEqual(expect.objectContaining({ level: 40, context: 'Redis' }));
  });
});
