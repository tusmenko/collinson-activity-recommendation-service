import { FORECAST_RETRY_AFTER_SECONDS } from './weather.const.js';

// Mapped to UPSTREAM_UNAVAILABLE by the api error filter: no forecast to serve, stored or fresh (D-8).
export class ForecastUnavailableError extends Error {
  readonly code = 'UPSTREAM_UNAVAILABLE';

  constructor(readonly retryAfterSeconds: number = FORECAST_RETRY_AFTER_SECONDS) {
    super('Forecast unavailable: the upstream failed and nothing is stored');
    this.name = 'ForecastUnavailableError';
  }
}
