import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { AppLogger } from '../logging/app-logger.service.js';
import { AnomalyCounter } from './anomaly-counter.port.js';

const METRIC = 'ranking_anomalies_total';

// Counts in memory and logs each increment; readable by tests until the OpenTelemetry exporter lands.
@Injectable()
export class LogAnomalyCounter extends AnomalyCounter {
  private readonly counts = new Map<string, number>();
  private readonly logger: Logger;

  constructor(logger: AppLogger) {
    super();
    this.logger = logger.pino.child({ component: 'AnomalyCounter' });
  }

  increment(type: string): void {
    const value = this.count(type) + 1;
    this.counts.set(type, value);
    this.logger.warn({ metric: METRIC, type, value }, 'anomaly counted');
  }

  count(type: string): number {
    return this.counts.get(type) ?? 0;
  }
}
