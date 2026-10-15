import { Module } from '@nestjs/common';

import { ApiModule } from './api/index';
import { InfraModule } from './infra/index';
import { LocationModule } from './location/index';
import { RankingModule } from './ranking/index';
import { WeatherModule } from './weather/index';

@Module({
  imports: [InfraModule, LocationModule, WeatherModule, RankingModule, ApiModule],
})
export class AppModule {}
