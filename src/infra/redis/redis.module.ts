import { Global, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';

import { ConfigService } from '../config/config.service';
import { AppLogger } from '../logging/app-logger.service';
import { QueueConnection } from './queue-connection.service';
import { REDIS_QUIT_FORCED, REDIS_QUIT_TIMEOUT_MS } from './redis.const';
import { resolvesWithin } from './redis.util';

@Global()
@Module({
  providers: [
    {
      provide: Redis,
      useFactory: (config: ConfigService, logger: AppLogger): Redis => {
        // One retry keeps commands failing fast while Redis is away instead of queueing indefinitely.
        const redis = new Redis(config.get('REDIS_URL'), { maxRetriesPerRequest: 1 });
        redis.on('error', (error: Error) => {
          logger.warn(error.message, 'Redis');
        });
        return redis;
      },
      inject: [ConfigService, AppLogger],
    },
    {
      provide: QueueConnection,
      useFactory: (config: ConfigService): QueueConnection =>
        new QueueConnection(config.get('REDIS_URL')),
      inject: [ConfigService],
    },
  ],
  exports: [Redis, QueueConnection],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(
    private readonly redis: Redis,
    private readonly logger: AppLogger,
  ) {}

  // Bounded so SIGTERM exits while Redis is away: QUIT only on a live connection and only for
  // REDIS_QUIT_TIMEOUT_MS; otherwise the socket is dropped without waiting. Never throws.
  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status !== 'ready') {
      this.redis.disconnect();
      return;
    }
    if (!(await resolvesWithin(this.redis.quit(), REDIS_QUIT_TIMEOUT_MS))) {
      this.logger.warn(REDIS_QUIT_FORCED, 'Redis');
      this.redis.disconnect();
    }
  }
}
