import { Injectable } from '@nestjs/common';

import { OpenMeteoClient } from '../../infra/index';
import type { GeocodingOutcome } from '../location.types';
import { GeocodingPort } from './geocoding.port';
import { toGeocodingResults } from './open-meteo-geocoding.util';

@Injectable()
export class OpenMeteoGeocodingAdapter extends GeocodingPort {
  constructor(private readonly client: OpenMeteoClient) {
    super();
  }

  async search(name: string): Promise<GeocodingOutcome> {
    const outcome = await this.client.searchLocations(name);
    if (outcome.kind === 'failed') {
      return { kind: 'failed', reason: outcome.reason, detail: outcome.detail };
    }
    return { kind: 'ok', results: toGeocodingResults(outcome.data) };
  }
}
