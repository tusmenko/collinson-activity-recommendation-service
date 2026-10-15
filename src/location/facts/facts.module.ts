import { Module } from '@nestjs/common';

import { FactsRepositoryPort } from './facts.port.js';
import { RedisFactsRepository } from './redis-facts.repository.js';

@Module({
  providers: [{ provide: FactsRepositoryPort, useClass: RedisFactsRepository }],
  exports: [FactsRepositoryPort],
})
export class FactsModule {}
