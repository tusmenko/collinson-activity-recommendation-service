import { afterAll, describe, expect, it } from 'vitest';

import { createTestRedis, flushTestKeys } from '../../setup/redis.js';

const redis = createTestRedis();

describe('harness Redis', () => {
  afterAll(async () => {
    await flushTestKeys(redis);
    await redis.quit();
  });

  it('harness SET then GET round-trips under the test key prefix', async () => {
    await redis.set('greeting', 'hello');

    expect(await redis.get('greeting')).toBe('hello');
  });

  it('harness flushTestKeys removes only the prefixed keys', async () => {
    await redis.set('doomed', '1');

    await flushTestKeys(redis);

    expect(await redis.exists('doomed')).toBe(0);
  });
});
