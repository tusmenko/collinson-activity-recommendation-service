import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { ConfigService } from '../config/config.service';
import { AppLogger } from '../logging/app-logger.service';
import { OPEN_METEO_HOSTS } from './open-meteo.const';
import type { ClientOutcome, OpenMeteoEndpoint, OpenMeteoRequest } from './open-meteo.types';
import { failureOf } from './open-meteo.util';

// The one HTTP path to Open-Meteo for every adapter: host or override, timeout, status check, JSON, the caller's
// pinned schema, and one log line per call. Never throws: every problem is a `failed` outcome.
@Injectable()
export class OpenMeteoClient {
  private readonly logger: Logger;

  constructor(
    private readonly config: ConfigService,
    logger: AppLogger,
  ) {
    this.logger = logger.pino.child({ component: 'OpenMeteoClient' });
  }

  async get<T>(request: OpenMeteoRequest<T>): Promise<ClientOutcome<T>> {
    const started = performance.now();
    const outcome = await this.fetchParsed(request);
    this.logger.info(
      {
        durationMs: Math.round(performance.now() - started),
        outcome: outcome.kind,
        ...(outcome.kind === 'failed' ? { reason: outcome.reason, detail: outcome.detail } : {}),
        schemaVersion: request.schemaVersion,
      },
      `${request.label} upstream call`,
    );
    return outcome;
  }

  private async fetchParsed<T>(request: OpenMeteoRequest<T>): Promise<ClientOutcome<T>> {
    try {
      const response = await fetch(this.url(request.endpoint, request.path, request.params), {
        signal: AbortSignal.timeout(this.config.get('UPSTREAM_TIMEOUT_MS')),
      });
      if (!response.ok) {
        return { kind: 'failed', reason: 'http', detail: `HTTP ${String(response.status)}` };
      }
      const raw: unknown = await response.json();
      const parsed = request.schema.safeParse(raw);
      if (!parsed.success) {
        return { kind: 'failed', reason: 'malformed', detail: parsed.error.message, raw };
      }
      return { kind: 'ok', data: parsed.data, raw };
    } catch (error) {
      return failureOf(error);
    }
  }

  // String concatenation keeps any path on the base URL (a proxy prefix or the stub's behaviour prefix).
  private url(endpoint: OpenMeteoEndpoint, path: string, params: URLSearchParams): URL {
    // Unset means the real host; set, it is the stub upstream or a proxy for the whole provider.
    const base = this.config.get('UPSTREAM_BASE_URL') ?? OPEN_METEO_HOSTS[endpoint];
    const url = new URL(`${base.replace(/\/$/, '')}${path}`);
    url.search = params.toString();
    return url;
  }
}
