import { afterAll, describe, expect, it } from 'vitest';

import { RedisThrottlerStorage } from '../../../src/infra/index';
import { createTestRedis, flushTestKeys } from '../../setup/redis';

const redis = createTestRedis();
const storage = new RedisThrottlerStorage(redis);

describe('RedisThrottlerStorage', () => {
  afterAll(async () => {
    await flushTestKeys(redis);
    await redis.quit();
  });

  it('I-THROTTLE-1 counts hits in a fixed window and reports its expiry in seconds', async () => {
    const first = await storage.increment('client-a', 60_000, 3, 30_000);
    const second = await storage.increment('client-a', 60_000, 3, 30_000);

    expect(first).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect(second).toMatchObject({ totalHits: 2, isBlocked: false });
    expect(await redis.pttl('throttle:v1:client-a')).toBeGreaterThan(59_000);
  });

  it('I-THROTTLE-1 the window is not extended by later hits', async () => {
    await storage.increment('client-b', 60_000, 3, 30_000);
    await redis.pexpire('throttle:v1:client-b', 5_000);

    const later = await storage.increment('client-b', 60_000, 3, 30_000);

    expect(later.timeToExpire).toBe(5);
  });

  it('I-THROTTLE-1 the hit past the limit blocks for blockDuration; the block outlives further hits', async () => {
    for (let hit = 0; hit < 2; hit += 1) {
      await storage.increment('client-c', 60_000, 2, 30_000);
    }

    const over = await storage.increment('client-c', 60_000, 2, 30_000);
    await redis.pexpire('throttle:v1:client-c:blocked', 10_000);
    const blocked = await storage.increment('client-c', 60_000, 2, 30_000);

    expect(over).toMatchObject({ totalHits: 3, isBlocked: true, timeToBlockExpire: 30 });
    expect(blocked).toMatchObject({ totalHits: 4, isBlocked: true, timeToBlockExpire: 10 });
  });

  it('I-THROTTLE-1 clients are counted separately', async () => {
    const other = await storage.increment('client-d', 60_000, 2, 30_000);

    expect(other).toMatchObject({ totalHits: 1, isBlocked: false });
  });
});
