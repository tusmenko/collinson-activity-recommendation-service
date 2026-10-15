import type { Coordinates, SourceFetchOutcome } from '../weather.types';

// Never throws: every upstream problem is a `failed` outcome.
export abstract class WeatherSourcePort {
  abstract fetchDays(coordinates: Coordinates, days: number): Promise<SourceFetchOutcome>;
}

// Separate DI tokens so the forecast and marine implementations are injected independently.
export abstract class ForecastSourcePort extends WeatherSourcePort {}

export abstract class MarineSourcePort extends WeatherSourcePort {}
