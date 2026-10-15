import { Module } from '@nestjs/common';

import { FactsModule } from './facts/facts.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { LocationService } from './location.service';

// FactsModule is re-exported: the api reconciles the marine fact through FactsRepositoryPort.
@Module({
  imports: [GeocodingModule, FactsModule],
  providers: [LocationService],
  exports: [LocationService, FactsModule],
})
export class LocationModule {}
