import { Module } from '@nestjs/common';

import { MarineSourcePort } from '../weather-source.port';
import { OpenMeteoMarineAdapter } from './open-meteo-marine.adapter';

@Module({
  providers: [{ provide: MarineSourcePort, useClass: OpenMeteoMarineAdapter }],
  exports: [MarineSourcePort],
})
export class MarineModule {}
