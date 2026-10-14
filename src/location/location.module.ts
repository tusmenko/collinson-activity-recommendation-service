import { Module } from '@nestjs/common';

import { FactsRepositoryPort } from './facts.port.js';
import { GeocodingPort } from './geocoding.port.js';
import { LocationService } from './location.service.js';
import { OpenMeteoGeocodingAdapter } from './open-meteo-geocoding.adapter.js';
import { RedisFactsRepository } from './redis-facts.repository.js';

@Module({
  providers: [
    { provide: GeocodingPort, useClass: OpenMeteoGeocodingAdapter },
    { provide: FactsRepositoryPort, useClass: RedisFactsRepository },
    LocationService,
  ],
  exports: [LocationService, FactsRepositoryPort],
})
export class LocationModule {}
