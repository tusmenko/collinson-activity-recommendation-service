import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UnrecoverableError, Worker } from 'bullmq';
import type { Job } from 'bullmq';
import type { Logger } from 'pino';

import { AppLogger, ClockPort, ConfigService, QueueConnection } from '../infra/index.js';
import { ForecastRepositoryPort } from './forecast.port.js';
import { INGEST_CONCURRENCY, INGEST_QUEUE } from './weather.const.js';
import { FairUseExceededError, IngestFailedError } from './weather.errors.js';
import { ForecastSourcePort, MarineSourcePort } from './weather-source.port.js';
import type { WeatherSourcePort } from './weather-source.port.js';
import type { IngestJobData, Source, SourceFetchOutcome } from './weather.types.js';

function outcomeOf(error: unknown): string {
  if (error instanceof IngestFailedError) {
    return error.reason;
  }
  return error instanceof FairUseExceededError ? 'fair-use' : 'error';
}

// Extract, transform, load for one (locationId, source): fetch FETCH_DAYS, store per-day keys (D-5).
@Injectable()
export class IngestProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<IngestJobData> | undefined;
  private readonly logger: Logger;
  private readonly sources: Readonly<Record<Source, WeatherSourcePort>>;

  // eslint-disable-next-line max-params -- Nest constructor injection: the worker connection, the fetch and store collaborators, and the logger
  constructor(
    private readonly queueConnection: QueueConnection,
    private readonly config: ConfigService,
    private readonly clock: ClockPort,
    private readonly repository: ForecastRepositoryPort,
    forecast: ForecastSourcePort,
    marine: MarineSourcePort,
    logger: AppLogger,
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
    if ((await this.repository.incrementDailyCounter(today)) > limit) {
      throw new FairUseExceededError(limit);
    }
  }

  private async store(data: IngestJobData, result: SourceFetchOutcome): Promise<void> {
    const { locationId, source } = data;
    if (result.kind === 'ok') {
      const days = result.days.map((signals) => ({
        signals,
        fetchedAt: this.clock.now().toISOString(),
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
}
