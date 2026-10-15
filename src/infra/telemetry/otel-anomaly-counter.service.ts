import { Injectable } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import type { Counter } from '@opentelemetry/api';
import type { Logger } from 'pino';

import { AppLogger } from '../logging/app-logger.service';
import { AnomalyCounter } from './anomaly-counter.port';
import { ANOMALY_METRIC, METER_NAME } from './telemetry.const';

// The OpenTelemetry counter behind ranking_anomalies_total{type} (design D-7), plus a warn log and an in-memory
// count tests can read. The meter comes from the global provider: the SDK's once main.ts started it, a no-op otherwise.
@Injectable()
export class OtelAnomalyCounter extends AnomalyCounter {
  private readonly counts = new Map<string, number>();
  private readonly logger: Logger;
  private readonly counter: Counter;

  constructor(logger: AppLogger) {
    super();
    this.logger = logger.pino.child({ component: 'AnomalyCounter' });
    this.counter = metrics
      .getMeter(METER_NAME)
      .createCounter(ANOMALY_METRIC, { description: 'Ranking invariant violations, by type' });
  }

  increment(type: string): void {
    const value = this.count(type) + 1;
    this.counts.set(type, value);
    this.counter.add(1, { type });
    this.logger.warn({ metric: ANOMALY_METRIC, type, value }, 'anomaly counted');
  }

  count(type: string): number {
    return this.counts.get(type) ?? 0;
  }
}
