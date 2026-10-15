import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { describe, expect, it } from 'vitest';

import { metricExporter } from './telemetry.util';

// Only the exporter choice is tested; starting the SDK in a test would register a global provider.
describe('U-EVENT-2 metric export', () => {
  it('U-EVENT-2 exports to the console when OTEL_EXPORTER is console', () => {
    expect(metricExporter('console')).toBeInstanceOf(ConsoleMetricExporter);
  });

  it('U-EVENT-2 exports over OTLP HTTP when OTEL_EXPORTER is otlp', () => {
    expect(metricExporter('otlp')).toBeInstanceOf(OTLPMetricExporter);
  });
});
