import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { ClockPort } from '../clock/clock.port';
import { ConfigService } from '../config/config.service';
import { AppLogger } from '../logging/app-logger.service';
import {
  FORECAST_DAILY_VARIABLES,
  FORECAST_HOURLY_VARIABLES,
  GEOCODING_COUNT,
  MARINE_DAILY_VARIABLES,
  OPEN_METEO_HOSTS,
  OPEN_METEO_PATHS,
  OPEN_METEO_SCHEMA_VERSION,
} from './open-meteo.const';
import {
  ForecastPayloadSchema,
  GeocodingPayloadSchema,
  MarinePayloadSchema,
} from './open-meteo.schema';
import type { ForecastPayload, GeocodingPayload, MarinePayload } from './open-meteo.schema';
import type {
  Coordinates,
  LocationSearchNarrowing,
  OpenMeteoOutcome,
  OpenMeteoRequest,
} from './open-meteo.types';
import { failureOf } from './open-meteo.util';

// Open-Meteo as three typed endpoints. The client owns hosts, parameters, pinned payload schemas, timeouts and the
// log line; adapters only translate the payloads. Never throws: every problem is a `failed` outcome.
@Injectable()
export class OpenMeteoClient {
  private readonly logger: Logger;

  constructor(
    private readonly config: ConfigService,
    logger: AppLogger,
    private readonly clock: ClockPort,
  ) {
    this.logger = logger.pino.child({ component: 'OpenMeteoClient' });
  }

  searchLocations(
    name: string,
    { region }: LocationSearchNarrowing = {},
  ): Promise<OpenMeteoOutcome<GeocodingPayload>> {
    return this.request({
      host: 'geocoding',
      path: OPEN_METEO_PATHS.search,
      params: {
        name: region === undefined ? name : `${name}, ${region}`,
        count: String(GEOCODING_COUNT),
        language: 'en',
        format: 'json',
      },
      schema: GeocodingPayloadSchema,
      label: 'geocoding',
    });
  }

  forecast(coordinates: Coordinates, days: number): Promise<OpenMeteoOutcome<ForecastPayload>> {
    return this.request({
      host: 'forecast',
      path: OPEN_METEO_PATHS.forecast,
      params: {
        ...this.position(coordinates),
        daily: FORECAST_DAILY_VARIABLES,
        hourly: FORECAST_HOURLY_VARIABLES,
        forecast_days: String(days),
        timezone: 'auto',
      },
      schema: ForecastPayloadSchema,
      label: 'forecast',
    });
  }

  marine(coordinates: Coordinates, days: number): Promise<OpenMeteoOutcome<MarinePayload>> {
    return this.request({
      host: 'marine',
      path: OPEN_METEO_PATHS.marine,
      params: {
        ...this.position(coordinates),
        daily: MARINE_DAILY_VARIABLES,
        forecast_days: String(days),
        timezone: 'auto',
      },
      schema: MarinePayloadSchema,
      label: 'marine',
    });
  }

  private async request<T>(spec: OpenMeteoRequest<T>): Promise<OpenMeteoOutcome<T>> {
    const started = performance.now();
    const outcome = await this.fetchParsed(spec);
    this.logger.info(
      {
        durationMs: Math.round(performance.now() - started),
        outcome: outcome.kind,
        ...(outcome.kind === 'failed' ? { reason: outcome.reason, detail: outcome.detail } : {}),
        schemaVersion: OPEN_METEO_SCHEMA_VERSION,
      },
      `${spec.label} upstream call`,
    );
    return outcome;
  }

  private async fetchParsed<T>(spec: OpenMeteoRequest<T>): Promise<OpenMeteoOutcome<T>> {
    try {
      const response = await fetch(this.url(spec), {
        signal: AbortSignal.timeout(this.config.get('UPSTREAM_TIMEOUT_MS')),
      });
      if (!response.ok) {
        return { kind: 'failed', reason: 'http', detail: `HTTP ${String(response.status)}` };
      }
      const raw: unknown = await response.json();
      const parsed = spec.schema.safeParse(raw);
      if (!parsed.success) {
        return { kind: 'failed', reason: 'malformed', detail: parsed.error.message, raw };
      }
      return { kind: 'ok', data: parsed.data, raw, fetchedAt: this.clock.now().toISOString() };
    } catch (error) {
      return failureOf(error);
    }
  }

  private position({ latitude, longitude }: Coordinates): Record<string, string> {
    return { latitude: String(latitude), longitude: String(longitude) };
  }

  // String concatenation keeps any path on the base URL (a proxy prefix or the stub's behaviour prefix).
  private url({ host, path, params }: OpenMeteoRequest<unknown>): URL {
    // Unset means the real host; set, it is the stub upstream or a proxy for the whole provider.
    const base = this.config.get('UPSTREAM_BASE_URL') ?? OPEN_METEO_HOSTS[host];
    const url = new URL(`${base.replace(/\/$/, '')}${path}`);
    url.search = new URLSearchParams(params).toString();
    return url;
  }
}
