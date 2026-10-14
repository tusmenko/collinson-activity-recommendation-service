import { Module } from '@nestjs/common';

import { OpenMeteoForecastAdapter } from './open-meteo-forecast.adapter.js';
import { OpenMeteoMarineAdapter } from './open-meteo-marine.adapter.js';
import { ForecastSourcePort, MarineSourcePort } from './weather-source.port.js';

@Module({
  providers: [
    { provide: ForecastSourcePort, useClass: OpenMeteoForecastAdapter },
    { provide: MarineSourcePort, useClass: OpenMeteoMarineAdapter },
  ],
  exports: [ForecastSourcePort, MarineSourcePort],
})
export class WeatherModule {}
