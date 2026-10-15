import { Module } from '@nestjs/common';

import { ForecastSourcePort } from '../weather-source.port';
import { OpenMeteoForecastAdapter } from './open-meteo-forecast.adapter';

@Module({
  providers: [{ provide: ForecastSourcePort, useClass: OpenMeteoForecastAdapter }],
  exports: [ForecastSourcePort],
})
export class ForecastModule {}
