import { Module } from '@nestjs/common';

import { GeocodingPort } from './geocoding.port';
import { OpenMeteoGeocodingAdapter } from './open-meteo-geocoding.adapter';

@Module({
  providers: [{ provide: GeocodingPort, useClass: OpenMeteoGeocodingAdapter }],
  exports: [GeocodingPort],
})
export class GeocodingModule {}
