import { Module } from '@nestjs/common';

import { ApiModule } from './api/index.js';
import { InfraModule } from './infra/index.js';
import { LocationModule } from './location/index.js';
import { RankingModule } from './ranking/index.js';
import { WeatherModule } from './weather/index.js';

@Module({
  imports: [InfraModule, LocationModule, WeatherModule, RankingModule, ApiModule],
})
export class AppModule {}
