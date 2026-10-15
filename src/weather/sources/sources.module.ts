import { Module } from '@nestjs/common';

import { ForecastModule } from './forecast/forecast.module';
import { MarineModule } from './marine/marine.module';

// Re-exports the two source modules, so importers get both port tokens.
@Module({
  imports: [ForecastModule, MarineModule],
  exports: [ForecastModule, MarineModule],
})
export class SourcesModule {}
