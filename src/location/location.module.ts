import { Module } from '@nestjs/common';

import { FactsModule } from './facts/facts.module.js';
import { GeocodingModule } from './geocoding/geocoding.module.js';
import { LocationService } from './location.service.js';

// FactsModule is re-exported: the api reconciles the marine fact through FactsRepositoryPort.
@Module({
  imports: [GeocodingModule, FactsModule],
  providers: [LocationService],
  exports: [LocationService, FactsModule],
})
export class LocationModule {}
