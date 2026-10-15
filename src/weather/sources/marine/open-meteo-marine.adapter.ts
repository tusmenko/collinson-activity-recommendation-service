import { Injectable } from '@nestjs/common';

import { ClockPort, OpenMeteoClient } from '../../../infra/index';
import type { Coordinates, Source, SourceFetchOutcome } from '../../weather.types';
import { MarineSourcePort } from '../weather-source.port';
import { MARINE_DAILY_VARIABLES, MARINE_SCHEMA_VERSION } from './marine.const';
import { OpenMeteoMarineSchema } from './open-meteo-marine.schema';
import { toDaySignals } from './open-meteo-marine.util';

@Injectable()
export class OpenMeteoMarineAdapter extends MarineSourcePort {
  readonly source: Source = 'MARINE';

  constructor(
    private readonly client: OpenMeteoClient,
    private readonly clock: ClockPort,
  ) {
    super();
  }

  async fetchDays({ latitude, longitude }: Coordinates, days: number): Promise<SourceFetchOutcome> {
    const outcome = await this.client.get({
      endpoint: 'marine',
      path: '/v1/marine',
      params: new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        daily: MARINE_DAILY_VARIABLES,
        forecast_days: String(days),
        timezone: 'auto',
      }),
      schema: OpenMeteoMarineSchema,
      schemaVersion: MARINE_SCHEMA_VERSION,
      label: 'marine',
    });
    if (outcome.kind === 'failed') {
      return outcome;
    }
    return {
      kind: 'ok',
      days: toDaySignals(outcome.data),
      raw: outcome.raw,
      providerSchemaVersion: MARINE_SCHEMA_VERSION,
      fetchedAt: this.clock.now().toISOString(),
    };
  }
}
