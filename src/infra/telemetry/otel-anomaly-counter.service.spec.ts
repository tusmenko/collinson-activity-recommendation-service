import { metrics } from '@opentelemetry/api';
import { MeterProvider, MetricReader } from '@opentelemetry/sdk-metrics';
import type { DataPoint } from '@opentelemetry/sdk-metrics';
import { afterEach, describe, expect, it } from 'vitest';

import { captureLogger } from '../../../test/setup/capture-logger';
import { OtelAnomalyCounter } from './otel-anomaly-counter.service';

// Collects on demand; the SDK itself is never started in tests.
class CollectingReader extends MetricReader {
  protected onForceFlush(): Promise<void> {
    return Promise.resolve();
  }

  protected onShutdown(): Promise<void> {
    return Promise.resolve();
  }
}

async function anomalyPoints(reader: CollectingReader): Promise<DataPoint<number>[]> {
  const { resourceMetrics } = await reader.collect();
  const metric = resourceMetrics.scopeMetrics
    .flatMap((scope) => scope.metrics)
    .find((candidate) => candidate.descriptor.name === 'ranking_anomalies_total');
  return (metric?.dataPoints ?? []) as DataPoint<number>[];
}

describe('U-EVENT-2 anomaly counter', () => {
  afterEach(() => {
    metrics.disable();
  });

  it('U-EVENT-2 adds one to ranking_anomalies_total per increment, labelled by type', async () => {
    const reader = new CollectingReader();
    metrics.setGlobalMeterProvider(new MeterProvider({ readers: [reader] }));
    const counter = new OtelAnomalyCounter(captureLogger().logger);

    counter.increment('window_mismatch');
    counter.increment('window_mismatch');
    counter.increment('missing_score');

    const points = await anomalyPoints(reader);
    const byType = Object.fromEntries(
      points.map((point) => [String(point.attributes.type), point.value]),
    );
    expect(byType).toEqual({ window_mismatch: 2, missing_score: 1 });
  });

  it('U-EVENT-2 keeps the warn log and the readable count without a meter provider', () => {
    const { logger, lines } = captureLogger();
    const counter = new OtelAnomalyCounter(logger);

    counter.increment('score_out_of_range');

    expect(counter.count('score_out_of_range')).toBe(1);
    expect(lines).toContainEqual(
      expect.objectContaining({
        level: 40,
        metric: 'ranking_anomalies_total',
        type: 'score_out_of_range',
        value: 1,
      }),
    );
  });
});
