import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import type { PushMetricExporter } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

import type { Env } from '../config/env.schema.js';
import { METER_NAME } from './telemetry.const.js';

// One export a minute keeps the console exporter from crowding the JSON log stream.
const EXPORT_INTERVAL_MS = 60_000;

// The OTLP exporter reads OTEL_EXPORTER_OTLP_ENDPOINT through the SDK's own environment handling.
export function metricExporter(kind: Env['OTEL_EXPORTER']): PushMetricExporter {
  return kind === 'otlp' ? new OTLPMetricExporter() : new ConsoleMetricExporter();
}

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
