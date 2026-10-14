import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';

export const TEST_REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

// A random prefix per client keeps parallel test files from seeing each other's keys.
export function createTestRedis(): Redis {
  return new Redis(TEST_REDIS_URL, { keyPrefix: `test:${randomUUID()}:` });
}

export async function flushTestKeys(redis: Redis): Promise<void> {
  const prefix = redis.options.keyPrefix;
  if (prefix === undefined || prefix === '') {
    throw new Error('flushTestKeys refuses to run on a client without a key prefix');
  }
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
    cursor = next;
    // SCAN returns full keys while DEL re-applies the prefix, so strip it first.
    const unprefixed = keys.map((key) => key.slice(prefix.length));
    if (unprefixed.length > 0) {
      await redis.del(...unprefixed);
    }
  } while (cursor !== '0');
}
