import { Global, Module } from '@nestjs/common';

import { RedisThrottlerStorage } from './redis-throttler-storage.adapter.js';

@Global()
@Module({
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class ThrottlingModule {}
