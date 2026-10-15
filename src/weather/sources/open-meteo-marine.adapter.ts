import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { AppLogger, ClockPort, ConfigService } from '../../infra/index.js';
import type { Coordinates, Source, SourceFetchOutcome } from '../weather.types.js';
import { OpenMeteoMarineSchema } from './open-meteo-marine.schema.js';
import { toDaySignals } from './open-meteo-marine.util.js';
import { failureOf } from './open-meteo.util.js';
import {
  MARINE_DAILY_VARIABLES,
  MARINE_SCHEMA_VERSION,
  OPEN_METEO_MARINE_URL,
} from './sources.const.js';
import { MarineSourcePort } from './weather-source.port.js';

@Injectable()
export class OpenMeteoMarineAdapter extends MarineSourcePort {
  readonly source: Source = 'MARINE';
  private readonly logger: Logger;

  constructor(
    private readonly config: ConfigService,
    logger: AppLogger,
    private readonly clock: ClockPort,
  ) {
    super();
    this.logger = logger.pino.child({ component: 'OpenMeteoMarineAdapter' });
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
      'marine upstream call',
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
      const parsed = OpenMeteoMarineSchema.safeParse(raw);
      if (!parsed.success) {
        return { kind: 'failed', reason: 'malformed', detail: parsed.error.message, raw };
      }
      return {
        kind: 'ok',
        days: toDaySignals(parsed.data),
        raw,
        providerSchemaVersion: MARINE_SCHEMA_VERSION,
        fetchedAt: this.clock.now().toISOString(),
      };
    } catch (error) {
      return failureOf(error);
    }
  }

  // String concatenation keeps any path on the base URL (a proxy prefix or the stub's behaviour prefix).
  private url({ latitude, longitude }: Coordinates, days: number): URL {
    // Unset means the real host; set, it is the stub upstream or a proxy for the whole provider.
    const base = this.config.get('UPSTREAM_BASE_URL') ?? OPEN_METEO_MARINE_URL;
    const url = new URL(`${base.replace(/\/$/, '')}/v1/marine`);
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('daily', MARINE_DAILY_VARIABLES);
    url.searchParams.set('forecast_days', String(days));
    url.searchParams.set('timezone', 'auto');
    return url;
  }
}
