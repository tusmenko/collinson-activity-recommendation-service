import { Module } from '@nestjs/common';

import { ForecastRepositoryPort } from './forecast.port';
import { RedisForecastRepository } from './redis-forecast.repository';

@Module({
  providers: [{ provide: ForecastRepositoryPort, useClass: RedisForecastRepository }],
  exports: [ForecastRepositoryPort],
})
export class StoreModule {}
