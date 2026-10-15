import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Source } from '../../../src/weather/index.js';
import { createIngestHarness } from '../../setup/ingest-harness.js';
import type { IngestHarness } from '../../setup/ingest-harness.js';

const LONDON = {
  id: 'test-london',
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: 'Europe/London',
};

function forecastJob(locationId: string): {
  locationId: string;
  source: Source;
  coordinates: { latitude: number; longitude: number };
} {
  return { locationId, source: 'FORECAST', coordinates: LONDON };
}

describe('ingest queue single flight', () => {
  let harness: IngestHarness;

  beforeAll(async () => {
    harness = await createIngestHarness();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('I-QUEUE-1 five concurrent cold reads of one location make one upstream call', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => harness.service.ensure(LONDON, ['FORECAST'])),
    );

    expect(harness.forecast.calls).toBe(1);
    expect(results.map((result) => result.stale)).toEqual([false, false, false, false, false]);
  });
});

describe('ingest queue limiter', () => {
  let harness: IngestHarness;

  beforeAll(async () => {
    harness = await createIngestHarness({
      OUTBOUND_PER_MINUTE: '5',
      OUTBOUND_LIMIT_WINDOW_MS: '1000',
    });
  });

  afterAll(async () => {
    await harness.close();
  });

  it('I-QUEUE-2 twenty jobs at five per window take more than three windows', async () => {
    const started = performance.now();

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        harness.queue.runOnce(forecastJob(`test-limited-${String(index)}`), 10_000),
      ),
    );

    expect(performance.now() - started).toBeGreaterThan(3_000);
    expect(results.every((result) => result.kind === 'completed')).toBe(true);
    expect(harness.forecast.calls).toBe(20);
  });
});

describe('ingest daily fair-use guard', () => {
  let harness: IngestHarness;

  beforeAll(async () => {
    harness = await createIngestHarness({ OUTBOUND_PER_DAY: '2' });
  });

  afterAll(async () => {
    await harness.close();
  });

  it('I-QUEUE-3 the job past OUTBOUND_PER_DAY fails as fair use without an upstream call', async () => {
    const first = await harness.queue.runOnce(forecastJob('test-day-1'), 4_500);
    const second = await harness.queue.runOnce(forecastJob('test-day-2'), 4_500);

    const third = await harness.queue.runOnce(forecastJob('test-day-3'), 4_500);

    expect([first.kind, second.kind]).toEqual(['completed', 'completed']);
    expect(third.kind).toBe('failed');
    expect(third.kind === 'failed' ? third.reason : '').toMatch(/fair-use/);
    expect(harness.forecast.calls).toBe(2);
  });
});
