import { Module } from '@nestjs/common';

import { EnrichQueue } from './enrich.queue.js';
import { ForecastRepositoryPort } from './forecast.port.js';
import { IngestProcessor } from './ingest.processor.js';
import { IngestQueue } from './ingest.queue.js';
import { IngestService } from './ingest.service.js';
import { OpenMeteoForecastAdapter } from './open-meteo-forecast.adapter.js';
import { OpenMeteoMarineAdapter } from './open-meteo-marine.adapter.js';
import { RedisForecastRepository } from './redis-forecast.repository.js';
import { ForecastSourcePort, MarineSourcePort } from './weather-source.port.js';
import { WindowService } from './window.service.js';

@Module({
  providers: [
    { provide: ForecastSourcePort, useClass: OpenMeteoForecastAdapter },
    { provide: MarineSourcePort, useClass: OpenMeteoMarineAdapter },
    { provide: ForecastRepositoryPort, useClass: RedisForecastRepository },
    WindowService,
    IngestQueue,
    IngestProcessor,
    IngestService,
    EnrichQueue,
  ],
  exports: [
    ForecastSourcePort,
    MarineSourcePort,
    ForecastRepositoryPort,
    WindowService,
    IngestService,
    EnrichQueue,
  ],
})
export class WeatherModule {}
