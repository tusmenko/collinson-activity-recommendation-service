export type { EnsureResult, SourceStatus } from './ingest/ingest.types';
export { IngestService } from './ingest/ingest.service';
export { WindowService } from './ingest/window.service';
export {
  ForecastSourcePort,
  MarineSourcePort,
  WeatherSourcePort,
} from './sources/weather-source.port';
export { ForecastRepositoryPort } from './store/forecast.port';
export { SOURCES } from './weather.const';
export { ForecastUnavailableError } from './weather.errors';
export { WeatherModule } from './weather.module';
export type { Coordinates, DaySignals, Source, SourceFetchOutcome } from './weather.types';
