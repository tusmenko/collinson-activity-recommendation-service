import { Injectable } from '@nestjs/common';

import { ClockPort, OpenMeteoClient } from '../../../infra/index';
import type { Coordinates, Source, SourceFetchOutcome } from '../../weather.types';
import { ForecastSourcePort } from '../weather-source.port';
import { FORECAST_DAILY_VARIABLES, FORECAST_SCHEMA_VERSION } from './forecast.const';
import { OpenMeteoForecastSchema } from './open-meteo-forecast.schema';
import { toDaySignals } from './open-meteo-forecast.util';

@Injectable()
export class OpenMeteoForecastAdapter extends ForecastSourcePort {
  readonly source: Source = 'FORECAST';

  constructor(
    private readonly client: OpenMeteoClient,
    private readonly clock: ClockPort,
  ) {
    super();
  }

  async fetchDays({ latitude, longitude }: Coordinates, days: number): Promise<SourceFetchOutcome> {
    const outcome = await this.client.get({
      endpoint: 'forecast',
      path: '/v1/forecast',
      params: new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        daily: FORECAST_DAILY_VARIABLES,
        hourly: 'snow_depth',
        forecast_days: String(days),
        timezone: 'auto',
      }),
      schema: OpenMeteoForecastSchema,
      schemaVersion: FORECAST_SCHEMA_VERSION,
      label: 'forecast',
    });
    if (outcome.kind === 'failed') {
      return outcome;
    }
    return {
      kind: 'ok',
      days: toDaySignals(outcome.data),
      raw: outcome.raw,
      providerSchemaVersion: FORECAST_SCHEMA_VERSION,
      fetchedAt: this.clock.now().toISOString(),
    };
  }
}
