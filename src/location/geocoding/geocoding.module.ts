import { Module } from '@nestjs/common';

import { GeocodingPort } from './geocoding.port.js';
import { OpenMeteoGeocodingAdapter } from './open-meteo-geocoding.adapter.js';

@Module({
  providers: [{ provide: GeocodingPort, useClass: OpenMeteoGeocodingAdapter }],
  exports: [GeocodingPort],
})
export class GeocodingModule {}
