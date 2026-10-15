import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

import { AppLogger, QueueConnection } from '../../infra/index.js';
import { ENRICH_QUEUE } from './queue.const.js';

// Registered without a processor (design D-5): the landing point for enrichment jobs that write
// location facts with their own version; nothing enqueues to it in the exercise.
@Injectable()
export class EnrichQueue implements OnModuleDestroy {
  readonly queue: Queue;

  constructor(queueConnection: QueueConnection, logger: AppLogger) {
    this.queue = new Queue(ENRICH_QUEUE, {
      connection: queueConnection.connection,
      prefix: queueConnection.prefix,
    });
    this.queue.on('error', (error: Error) => {
      logger.warn(error.message, 'EnrichQueue');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
