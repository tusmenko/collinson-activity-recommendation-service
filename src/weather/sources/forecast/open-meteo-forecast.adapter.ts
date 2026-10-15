import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { AppLogger, ClockPort, ConfigService } from '../../../infra/index';
import type { Coordinates, Source, SourceFetchOutcome } from '../../weather.types';
import { OpenMeteoForecastSchema } from './open-meteo-forecast.schema';
import { toDaySignals } from './open-meteo-forecast.util';
import { failureOf } from '../open-meteo.util';
import {
  FORECAST_DAILY_VARIABLES,
  FORECAST_SCHEMA_VERSION,
  OPEN_METEO_FORECAST_URL,
} from './forecast.const';
import { ForecastSourcePort } from '../weather-source.port';

@Injectable()
export class OpenMeteoForecastAdapter extends ForecastSourcePort {
  readonly source: Source = 'FORECAST';
  private readonly logger: Logger;

  constructor(
    private readonly config: ConfigService,
    logger: AppLogger,
    private readonly clock: ClockPort,
  ) {
    super();
    this.logger = logger.pino.child({ component: 'OpenMeteoForecastAdapter' });
  }

  async fetchDays(coordinates: Coordinates, days: number): Promise<SourceFetchOutcome> {
    const started = performance.now();
    const outcome = await this.request(this.url(coordinates, days));
    this.logger.info(
      {
        durationMs: Math.round(performance.now() - started),
        outcome: outcome.kind,
        ...(outcome.kind === 'failed' ? { reason: outcome.reason, detail: outcome.detail } : {}),
      },
      'forecast upstream call',
    );
    return outcome;
  }

  private async request(url: URL): Promise<SourceFetchOutcome> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.get('UPSTREAM_TIMEOUT_MS')),
      });
      if (!response.ok) {
        return { kind: 'failed', reason: 'http', detail: `HTTP ${String(response.status)}` };
      }
      const raw: unknown = await response.json();
      const parsed = OpenMeteoForecastSchema.safeParse(raw);
      if (!parsed.success) {
        return { kind: 'failed', reason: 'malformed', detail: parsed.error.message, raw };
      }
      return {
        kind: 'ok',
        days: toDaySignals(parsed.data),
        raw,
        providerSchemaVersion: FORECAST_SCHEMA_VERSION,
        fetchedAt: this.clock.now().toISOString(),
      };
    } catch (error) {
      return failureOf(error);
    }
  }

  // String concatenation keeps any path on the base URL (a proxy prefix or the stub's behaviour prefix).
  private url({ latitude, longitude }: Coordinates, days: number): URL {
    // Unset means the real host; set, it is the stub upstream or a proxy for the whole provider.
    const base = this.config.get('UPSTREAM_BASE_URL') ?? OPEN_METEO_FORECAST_URL;
    const url = new URL(`${base.replace(/\/$/, '')}/v1/forecast`);
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('daily', FORECAST_DAILY_VARIABLES);
    url.searchParams.set('hourly', 'snow_depth');
    url.searchParams.set('forecast_days', String(days));
    url.searchParams.set('timezone', 'auto');
    return url;
  }
}
