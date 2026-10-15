import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import type { PushMetricExporter } from '@opentelemetry/sdk-metrics';

import type { Env } from '../config/env.schema.js';

// The OTLP exporter reads OTEL_EXPORTER_OTLP_ENDPOINT through the SDK's own environment handling.
export function metricExporter(kind: Env['OTEL_EXPORTER']): PushMetricExporter {
  return kind === 'otlp' ? new OTLPMetricExporter() : new ConsoleMetricExporter();
}
