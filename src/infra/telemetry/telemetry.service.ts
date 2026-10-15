import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

import type { Env } from '../config/env.schema.js';
import { EXPORT_INTERVAL_MS, METER_NAME } from './telemetry.const.js';
import { metricExporter } from './telemetry.util.js';

// The OpenTelemetry SDK, metrics only. main.ts starts it before Nest so the global meter provider exists when the
// anomaly counter is built; tests never start it and get the API's no-op meter.
export class TelemetryService {
  private readonly sdk: NodeSDK;

  constructor(exporter: Env['OTEL_EXPORTER']) {
    const reader = new PeriodicExportingMetricReader({
      exporter: metricExporter(exporter),
      exportIntervalMillis: EXPORT_INTERVAL_MS,
    });
    // Empty span and log processors stop the SDK defaulting traces and logs to an OTLP endpoint.
    this.sdk = new NodeSDK({
      serviceName: METER_NAME,
      metricReaders: [reader],
      spanProcessors: [],
      logRecordProcessors: [],
    });
  }

  start(): void {
    this.sdk.start();
  }

  // Flushes the last export.
  shutdown(): Promise<void> {
    return this.sdk.shutdown();
  }
}
