import { Module } from '@nestjs/common';

import { FactsRepositoryPort } from './facts.port';
import { RedisFactsRepository } from './redis-facts.repository';

@Module({
  providers: [{ provide: FactsRepositoryPort, useClass: RedisFactsRepository }],
  exports: [FactsRepositoryPort],
})
export class FactsModule {}
