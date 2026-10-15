import { Injectable } from '@nestjs/common';

import { OpenMeteoClient } from '../../infra/index';
import { GEOCODING_RESULT_COUNT } from '../location.const';
import type { GeocodingOutcome } from '../location.types';
import { GEOCODING_SCHEMA_VERSION } from './geocoding.const';
import { GeocodingPort } from './geocoding.port';
import { OpenMeteoGeocodingSchema } from './open-meteo-geocoding.schema';
import { toGeocodingResults } from './open-meteo-geocoding.util';

@Injectable()
export class OpenMeteoGeocodingAdapter extends GeocodingPort {
  constructor(private readonly client: OpenMeteoClient) {
    super();
  }

  async search(name: string): Promise<GeocodingOutcome> {
    const outcome = await this.client.get({
      endpoint: 'geocoding',
      path: '/v1/search',
      params: new URLSearchParams({
        name,
        count: String(GEOCODING_RESULT_COUNT),
        language: 'en',
        format: 'json',
      }),
      schema: OpenMeteoGeocodingSchema,
      schemaVersion: GEOCODING_SCHEMA_VERSION,
      label: 'geocoding',
    });
    if (outcome.kind === 'failed') {
      return { kind: 'failed', reason: outcome.reason, detail: outcome.detail };
    }
    return { kind: 'ok', results: toGeocodingResults(outcome.data) };
  }
}
