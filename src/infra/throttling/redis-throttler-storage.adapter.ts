import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';

import { THROTTLE_KEY_PREFIX } from './throttling.const';
import type { ThrottlerStorageRecord } from './throttling.types';
import { toSeconds } from './throttling.util';

// Fixed-window hit counter shared by every replica; @nest-lab/throttler-storage-redis stops at Nest 11.
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `${THROTTLE_KEY_PREFIX}:${key}`;
    const blockKey = `${hitsKey}:blocked`;
    const replies = await this.redis
      .multi()
      .incr(hitsKey)
      .pexpire(hitsKey, ttl, 'NX')
      .pttl(hitsKey)
      .pttl(blockKey)
      .exec();
    const [hits, , hitsTtl, blockTtl] = (replies ?? []).map(([, value]) => Number(value));
    const totalHits = hits ?? 0;
    let blockMs = blockTtl ?? -1;
    if (blockMs <= 0 && totalHits > limit) {
      await this.redis.set(blockKey, '1', 'PX', blockDuration, 'NX');
      blockMs = blockDuration;
    }
    return {
      totalHits,
      timeToExpire: toSeconds(hitsTtl ?? ttl),
      isBlocked: blockMs > 0,
      timeToBlockExpire: toSeconds(blockMs),
    };
  }
}
