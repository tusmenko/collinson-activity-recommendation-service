import { metrics } from '@opentelemetry/api';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  afterEach(() => {
    metrics.disable();
    vi.restoreAllMocks();
  });

  it('U-EVENT-2 start registers a global meter provider; shutdown flushes and resolves', async () => {
    // The console exporter prints the final flush; keep the test output clean.
    vi.spyOn(console, 'dir').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const before = metrics.getMeterProvider();
    const telemetry = new TelemetryService('console');

    telemetry.start();
    const started = metrics.getMeterProvider();
    started.getMeter('probe').createCounter('probe_total').add(1);

    expect(started).not.toBe(before);
    await expect(telemetry.shutdown()).resolves.toBeUndefined();
  });

  it('U-EVENT-2 builds the OTLP pipeline without starting it', async () => {
    const telemetry = new TelemetryService('otlp');

    await expect(telemetry.shutdown()).resolves.toBeUndefined();
  });
});
