import { Injectable } from '@nestjs/common';

import { OPEN_METEO_SCHEMA_VERSION, OpenMeteoClient } from '../../../infra/index';
import type { Coordinates, Source, SourceFetchOutcome } from '../../weather.types';
import { ForecastSourcePort } from '../weather-source.port';
import { toDaySignals } from './open-meteo-forecast.util';

@Injectable()
export class OpenMeteoForecastAdapter extends ForecastSourcePort {
  readonly source: Source = 'FORECAST';

  constructor(private readonly client: OpenMeteoClient) {
    super();
  }

  async fetchDays(coordinates: Coordinates, days: number): Promise<SourceFetchOutcome> {
    const outcome = await this.client.forecast(coordinates, days);
    if (outcome.kind === 'failed') {
      return outcome;
    }
    return {
      kind: 'ok',
      days: toDaySignals(outcome.data),
      raw: outcome.raw,
      providerSchemaVersion: OPEN_METEO_SCHEMA_VERSION,
      fetchedAt: outcome.fetchedAt,
    };
  }
}
