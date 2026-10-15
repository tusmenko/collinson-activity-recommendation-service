import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { AppLogger, ClockPort, ConfigService } from '../infra/index.js';
import { MARINE_SCHEMA_VERSION } from './weather.const.js';
import { MarineSourcePort } from './weather-source.port.js';
import type { Coordinates, DaySignals, Source, SourceFetchOutcome } from './weather.types.js';
import { OpenMeteoMarineSchema } from './open-meteo-marine.schema.js';
import type { OpenMeteoMarine } from './open-meteo-marine.schema.js';

const DAILY_VARIABLES = 'wave_height_max,wave_period_max,swell_wave_height_max';

type Failed = Extract<SourceFetchOutcome, { kind: 'failed' }>;
type Series = readonly (number | null)[];

function failureOf(error: unknown): Failed {
  const name = error instanceof Error ? error.name : '';
  const detail = error instanceof Error ? error.message : String(error);
  if (name === 'TimeoutError' || name === 'AbortError') {
    return { kind: 'failed', reason: 'timeout', detail };
  }
  if (error instanceof SyntaxError) {
    return { kind: 'failed', reason: 'malformed', detail };
  }
  return { kind: 'failed', reason: 'network', detail };
}

function at(values: Series, index: number): number | null {
  return values[index] ?? null;
}

// Inland nulls stay null: absence of marine data is a signal for the classifiers, not an error.
function toDaySignals({ daily }: OpenMeteoMarine): DaySignals[] {
  return daily.time.map((date, index) => ({
    date,
    tempMax: null,
    tempMin: null,
    precipitation: null,
    precipitationProbability: null,
    snowfall: null,
    snowDepth: null,
    windMax: null,
    windGusts: null,
    cloudCover: null,
    uvIndex: null,
    sunshineHours: null,
    visibility: null,
    weatherCode: null,
    waveHeight: at(daily.wave_height_max, index),
    wavePeriod: at(daily.wave_period_max, index),
    swellHeight: at(daily.swell_wave_height_max, index),
  }));
}

// The adapter's normalisation without the fetch, for golden tests over recorded bodies; null when the shape is wrong.
export function normaliseMarinePayload(payload: unknown): DaySignals[] | null {
  const parsed = OpenMeteoMarineSchema.safeParse(payload);
  return parsed.success ? toDaySignals(parsed.data) : null;
}

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
    const base = this.config.get('UPSTREAM_MARINE_URL').replace(/\/$/, '');
    const url = new URL(`${base}/v1/marine`);
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('daily', DAILY_VARIABLES);
    url.searchParams.set('forecast_days', String(days));
    url.searchParams.set('timezone', 'auto');
    return url;
  }
}
