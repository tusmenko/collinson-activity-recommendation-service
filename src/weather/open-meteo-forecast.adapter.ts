import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { AppLogger, ClockPort, ConfigService } from '../infra/index.js';
import { FORECAST_SCHEMA_VERSION, OPEN_METEO_FORECAST_URL } from './weather.const.js';
import { ForecastSourcePort } from './weather-source.port.js';
import type { Coordinates, DaySignals, Source, SourceFetchOutcome } from './weather.types.js';
import { OpenMeteoForecastSchema } from './open-meteo-forecast.schema.js';
import type { OpenMeteoForecast } from './open-meteo-forecast.schema.js';

const DAILY_VARIABLES = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'snowfall_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'cloud_cover_mean',
  'uv_index_max',
  'sunshine_duration',
  'visibility_mean',
].join(',');
const SECONDS_PER_HOUR = 3_600;
const CM_PER_M = 100;

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

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function at(values: Series, index: number): number | null {
  return values[index] ?? null;
}

// Hourly snow depth (m) reduced to a daily maximum (cm) keyed by local date.
function dailySnowDepthCm(hourly: OpenMeteoForecast['hourly']): Map<string, number> {
  const maxima = new Map<string, number>();
  hourly.time.forEach((stamp, index) => {
    const depth = hourly.snow_depth[index];
    const date = stamp.slice(0, 10);
    if (depth !== null && depth !== undefined) {
      maxima.set(date, Math.max(maxima.get(date) ?? depth, depth));
    }
  });
  return new Map([...maxima].map(([date, metres]) => [date, oneDecimal(metres * CM_PER_M)]));
}

function toDaySignals(payload: OpenMeteoForecast): DaySignals[] {
  const { daily } = payload;
  const snowDepth = dailySnowDepthCm(payload.hourly);
  return daily.time.map((date, index) => {
    const sunshineSeconds = at(daily.sunshine_duration, index);
    return {
      date,
      tempMax: at(daily.temperature_2m_max, index),
      tempMin: at(daily.temperature_2m_min, index),
      precipitation: at(daily.precipitation_sum, index),
      precipitationProbability: at(daily.precipitation_probability_max, index),
      snowfall: at(daily.snowfall_sum, index),
      snowDepth: snowDepth.get(date) ?? null,
      windMax: at(daily.wind_speed_10m_max, index),
      windGusts: at(daily.wind_gusts_10m_max, index),
      cloudCover: at(daily.cloud_cover_mean, index),
      uvIndex: at(daily.uv_index_max, index),
      sunshineHours:
        sunshineSeconds === null ? null : oneDecimal(sunshineSeconds / SECONDS_PER_HOUR),
      visibility: at(daily.visibility_mean, index),
      weatherCode: at(daily.weather_code, index),
      waveHeight: null,
      wavePeriod: null,
      swellHeight: null,
    };
  });
}

// The adapter's normalisation without the fetch, for golden tests over recorded bodies; null when the shape is wrong.
export function normaliseForecastPayload(payload: unknown): DaySignals[] | null {
  const parsed = OpenMeteoForecastSchema.safeParse(payload);
  return parsed.success ? toDaySignals(parsed.data) : null;
}

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
    url.searchParams.set('daily', DAILY_VARIABLES);
    url.searchParams.set('hourly', 'snow_depth');
    url.searchParams.set('forecast_days', String(days));
    url.searchParams.set('timezone', 'auto');
    return url;
  }
}
