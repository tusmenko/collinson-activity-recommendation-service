import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';

import {
  AppLogger,
  closeWithin,
  ConfigService,
  QueueConnection,
  resolvesWithin,
} from '../../infra/index';
import {
  INGEST_BACKOFF_MS,
  INGEST_QUEUE,
  MAX_WAIT_LISTENERS,
  QUEUE_CLOSE_FORCED,
  QUEUE_CLOSE_TIMEOUT_MS,
  QUEUE_NOT_READY,
  QUEUE_READY_TIMEOUT_MS,
  TIMED_OUT,
} from './queue.const';
import type { IngestJobData, IngestJobResult } from './queue.types';

// Single flight per (locationId, source): a duplicate add while the job exists is a no-op, and
// removeOnComplete lets the next stale read run it again (design D-5, spike S-3).
@Injectable()
export class IngestQueue implements OnModuleInit, OnModuleDestroy {
  private readonly queue: Queue<IngestJobData>;
  private readonly events: QueueEvents;

  constructor(
    queueConnection: QueueConnection,
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
  ) {
    const options = { connection: queueConnection.connection, prefix: queueConnection.prefix };
    this.queue = new Queue<IngestJobData>(INGEST_QUEUE, options);
    this.events = new QueueEvents(INGEST_QUEUE, options);
    this.queue.setMaxListeners(MAX_WAIT_LISTENERS);
    this.events.setMaxListeners(MAX_WAIT_LISTENERS);
    // An unhandled 'error' event would crash the process while Redis is away; health reports it.
    const onError = (error: Error): void => {
      logger.warn(error.message, 'IngestQueue');
    };
    this.queue.on('error', onError);
    this.events.on('error', onError);
  }

  // Bounded: unbounded, a Redis that is away at boot kept the process from ever listening, health included.
  async onModuleInit(): Promise<void> {
    if (!(await resolvesWithin(this.events.waitUntilReady(), QUEUE_READY_TIMEOUT_MS))) {
      this.logger.warn(QUEUE_NOT_READY, 'IngestQueue');
    }
  }

  async runOnce(data: IngestJobData, boundMs: number): Promise<IngestJobResult> {
    try {
      const job = await this.queue.add(INGEST_QUEUE, data, {
        jobId: `${data.locationId}__${data.source}`,
        removeOnComplete: true,
        removeOnFail: true,
        attempts: this.config.get('UPSTREAM_RETRIES') + 1,
        backoff: { type: 'exponential', delay: INGEST_BACKOFF_MS },
      });
      await job.waitUntilFinished(this.events, boundMs);
      return { kind: 'completed' };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return reason.includes(TIMED_OUT) ? { kind: 'timed-out' } : { kind: 'failed', reason };
    }
  }

  async obliterate(): Promise<void> {
    await this.queue.obliterate({ force: true });
  }

  // Bounded too: with Redis away, QueueEvents.close() never settles and SIGTERM would never exit.
  async onModuleDestroy(): Promise<void> {
    const outcomes = await Promise.all([
      closeWithin(this.events, QUEUE_CLOSE_TIMEOUT_MS),
      closeWithin(this.queue, QUEUE_CLOSE_TIMEOUT_MS),
    ]);
    if (outcomes.includes('forced')) {
      this.logger.warn(QUEUE_CLOSE_FORCED, 'IngestQueue');
    }
  }
}
