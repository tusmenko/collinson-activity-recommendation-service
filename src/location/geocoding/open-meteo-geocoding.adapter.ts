import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { AppLogger, ConfigService } from '../../infra/index';
import { GEOCODING_RESULT_COUNT } from '../location.const';
import type { GeocodingOutcome } from '../location.types';
import { GEOCODING_SCHEMA_VERSION, OPEN_METEO_GEOCODING_URL } from './geocoding.const';
import { GeocodingPort } from './geocoding.port';
import { OpenMeteoGeocodingSchema } from './open-meteo-geocoding.schema';
import { failureOf, toGeocodingResults } from './open-meteo-geocoding.util';

@Injectable()
export class OpenMeteoGeocodingAdapter extends GeocodingPort {
  private readonly logger: Logger;

  constructor(
    private readonly config: ConfigService,
    logger: AppLogger,
  ) {
    super();
    this.logger = logger.pino.child({ component: 'OpenMeteoGeocodingAdapter' });
  }

  async search(name: string): Promise<GeocodingOutcome> {
    const started = performance.now();
    const outcome = await this.request(name);
    this.logger.info(
      {
        durationMs: Math.round(performance.now() - started),
        outcome: outcome.kind,
        ...(outcome.kind === 'failed' ? { reason: outcome.reason, detail: outcome.detail } : {}),
        schemaVersion: GEOCODING_SCHEMA_VERSION,
      },
      'geocoding upstream call',
    );
    return outcome;
  }

  private async request(name: string): Promise<GeocodingOutcome> {
    try {
      const response = await fetch(this.url(name), {
        signal: AbortSignal.timeout(this.config.get('UPSTREAM_TIMEOUT_MS')),
      });
      if (!response.ok) {
        return { kind: 'failed', reason: 'http', detail: `HTTP ${String(response.status)}` };
      }
      const parsed = OpenMeteoGeocodingSchema.safeParse(await response.json());
      if (!parsed.success) {
        return { kind: 'failed', reason: 'malformed', detail: parsed.error.message };
      }
      return { kind: 'ok', results: toGeocodingResults(parsed.data) };
    } catch (error) {
      return failureOf(error);
    }
  }

  // String concatenation keeps any path on the base URL (a proxy prefix or the stub's behaviour prefix).
  private url(name: string): URL {
    // Unset means the real host; set, it is the stub upstream or a proxy for the whole provider.
    const base = this.config.get('UPSTREAM_BASE_URL') ?? OPEN_METEO_GEOCODING_URL;
    const url = new URL(`${base.replace(/\/$/, '')}/v1/search`);
    url.searchParams.set('name', name);
    url.searchParams.set('count', String(GEOCODING_RESULT_COUNT));
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    return url;
  }
}
