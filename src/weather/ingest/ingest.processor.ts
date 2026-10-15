import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UnrecoverableError, Worker } from 'bullmq';
import type { Job } from 'bullmq';
import type { Logger } from 'pino';

import {
  AnomalyCounter,
  AppLogger,
  ClockPort,
  ConfigService,
  QueueConnection,
} from '../../infra/index';
import { INGEST_CONCURRENCY, INGEST_QUEUE } from '../queue/queue.const';
import type { IngestJobData } from '../queue/queue.types';
import { ForecastSourcePort, MarineSourcePort } from '../sources/weather-source.port';
import type { WeatherSourcePort } from '../sources/weather-source.port';
import { ForecastRepositoryPort } from '../store/forecast.port';
import type { Source, SourceFetchOutcome } from '../weather.types';
import { UPSTREAM_DRIFT } from './ingest.const';
import { FairUseExceededError, IngestFailedError } from './ingest.errors';
import { outcomeOf } from './ingest.util';

// Extract, transform, load for one (locationId, source): fetch FETCH_DAYS, store per-day keys (D-5).
@Injectable()
export class IngestProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<IngestJobData> | undefined;
  private readonly logger: Logger;
  private readonly sources: Readonly<Record<Source, WeatherSourcePort>>;

  // eslint-disable-next-line max-params -- Nest constructor injection: the worker connection, the fetch and store collaborators, the logger and the anomaly counter
  constructor(
    private readonly queueConnection: QueueConnection,
    private readonly config: ConfigService,
    private readonly clock: ClockPort,
    private readonly repository: ForecastRepositoryPort,
    forecast: ForecastSourcePort,
    marine: MarineSourcePort,
    logger: AppLogger,
    private readonly anomalies: AnomalyCounter,
  ) {
    this.logger = logger.pino.child({ component: 'IngestProcessor' });
    this.sources = { FORECAST: forecast, MARINE: marine };
  }

  // The worker runs in this process only when enabled, so it can move to a worker deployment unchanged.
  onModuleInit(): void {
    if (!this.config.get('QUEUE_PROCESSORS_ENABLED')) {
      return;
    }
    this.worker = new Worker<IngestJobData>(INGEST_QUEUE, (job) => this.process(job), {
      connection: this.queueConnection.connection,
      prefix: this.queueConnection.prefix,
      concurrency: INGEST_CONCURRENCY,
      limiter: {
        max: this.config.get('OUTBOUND_PER_MINUTE'),
        duration: this.config.get('OUTBOUND_LIMIT_WINDOW_MS'),
      },
    });
    this.worker.on('error', (error: Error) => {
      this.logger.warn({ err: error }, 'ingest worker error');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<IngestJobData>): Promise<void> {
    const started = performance.now();
    const { locationId, source } = job.data;
    let outcome = 'ok';
    try {
      await this.guardFairUse();
      const result = await this.sources[source].fetchDays(
        job.data.coordinates,
        this.config.get('FETCH_DAYS'),
      );
      await this.store(job.data, result);
    } catch (error) {
      outcome = outcomeOf(error);
      if (outcome === 'malformed') {
        this.anomalies.increment(UPSTREAM_DRIFT);
      }
      // Retrying cannot help once the daily budget is spent, and would count against it again.
      throw error instanceof FairUseExceededError ? new UnrecoverableError(error.message) : error;
    } finally {
      this.logger.info(
        {
          event: 'ingest.run',
          locationId,
          source,
          durationMs: Math.round(performance.now() - started),
          outcome,
          attempt: job.attemptsMade + 1,
        },
        'ingest.run',
      );
    }
  }

  private async guardFairUse(): Promise<void> {
    const today = this.clock.now().toISOString().slice(0, 10);
    const limit = this.config.get('OUTBOUND_PER_DAY');
    // Counted before the fetch and once per attempt, so a fetch that never reached the provider still
    // counts: an overcount, which is the safe direction for a fair-use cap.
    if ((await this.repository.incrementDailyCounter(today)) > limit) {
      throw new FairUseExceededError(limit);
    }
  }

  private async store(data: IngestJobData, result: SourceFetchOutcome): Promise<void> {
    const { locationId, source } = data;
    if (result.kind === 'ok') {
      this.warnIfShort(data, result.days.length);
      const days = result.days.map((signals) => ({
        signals,
        fetchedAt: result.fetchedAt,
        providerSchemaVersion: result.providerSchemaVersion,
      }));
      await this.repository.writeWindow(locationId, source, days, result.raw);
      return;
    }
    // A body that failed validation is kept for replay and drift checks; no day keys change (D-8).
    if (result.raw !== undefined) {
      await this.repository.writeWindow(locationId, source, [], result.raw);
    }
    await this.repository.writeLastError(locationId, {
      step: `fetch:${source}`,
      error: `${result.reason}: ${result.detail}`,
      at: this.clock.now().toISOString(),
    });
    throw new IngestFailedError(result.reason, result.detail);
  }

  // Thrash risk: a window date the provider did not return stays missing, so every read of this
  // location refetches it until the provider's horizon covers it again.
  private warnIfShort({ locationId, source }: IngestJobData, received: number): void {
    const requested = this.config.get('FETCH_DAYS');
    if (received < requested) {
      this.logger.warn(
        { event: 'ingest.short_window', locationId, source, requested, received },
        'ingest.short_window: fewer days than requested; missing dates refetch on every read',
      );
    }
  }
}
