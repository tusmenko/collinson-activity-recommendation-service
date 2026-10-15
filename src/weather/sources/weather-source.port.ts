import type { Coordinates, Source, SourceFetchOutcome } from './weather.types.js';

// Never throws: every upstream problem is a `failed` outcome.
export abstract class WeatherSourcePort {
  abstract readonly source: Source;

  abstract fetchDays(coordinates: Coordinates, days: number): Promise<SourceFetchOutcome>;
}

// Separate DI tokens so the forecast and marine implementations are injected independently.
export abstract class ForecastSourcePort extends WeatherSourcePort {}

export abstract class MarineSourcePort extends WeatherSourcePort {}
