export type { EnsureResult, SourceStatus } from './ingest/ingest.types.js';
export { IngestService } from './ingest/ingest.service.js';
export { WindowService } from './ingest/window.service.js';
export {
  ForecastSourcePort,
  MarineSourcePort,
  WeatherSourcePort,
} from './sources/weather-source.port.js';
export { ForecastRepositoryPort } from './store/forecast.port.js';
export { SOURCES } from './weather.const.js';
export { ForecastUnavailableError } from './weather.errors.js';
export { WeatherModule } from './weather.module.js';
export type { Coordinates, DaySignals, Source, SourceFetchOutcome } from './weather.types.js';
