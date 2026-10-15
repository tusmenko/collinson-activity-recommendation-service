import { Module } from '@nestjs/common';

import { ForecastRepositoryPort } from './forecast.port.js';
import { RedisForecastRepository } from './redis-forecast.repository.js';

@Module({
  providers: [{ provide: ForecastRepositoryPort, useClass: RedisForecastRepository }],
  exports: [ForecastRepositoryPort],
})
export class StoreModule {}
