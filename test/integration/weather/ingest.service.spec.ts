import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ForecastUnavailableError } from '../../../src/weather/index';
import type { EnsureResult, Source, SourceStatus } from '../../../src/weather/index';
import { FIXED_NOW } from '../../setup/fixed-clock';
import { createIngestHarness } from '../../setup/ingest-harness';
import type { IngestHarness, TestLocation } from '../../setup/ingest-harness';

const LONDON: TestLocation = {
  id: 'test-london',
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: 'Europe/London',
};
const SEEDED_AT = '2026-10-14T20:00:00.000Z';
const NOW_ISO = FIXED_NOW.toISOString();
const DAY_MS = 86_400_000;
// Below RETENTION_TTL - FRESHNESS_TTL (18 h at the defaults): the key is older than FRESHNESS_TTL.
const STALE_PTTL_MS = 3_600_000;

function dayKey(location: TestLocation, source: string, date: string): string {
  return `forecast:v1:${location.id}:${source}:${date}`;
}

function statusOf(result: EnsureResult, source: Source): SourceStatus | undefined {
  return result.sources.find((status) => status.source === source);
}

function runEvents(logs: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  return logs.filter((line) => line.event === 'ingest.run');
}

describe('IngestService refresh on read and degradation', () => {
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

  async function seedStale(location: TestLocation): Promise<string[]> {
    const dates = await harness.seedWindow(location, 'FORECAST', SEEDED_AT);
    await harness.redis.pexpire(dayKey(location, 'FORECAST', dates[3] ?? ''), STALE_PTTL_MS);
    return dates;
  }

  it('I-STORE-1 a key past the freshness limit triggers one refetch and serves fresh', async () => {
    await seedStale(LONDON);

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    expect(harness.forecast.calls).toBe(1);
    expect(result).toMatchObject({ stale: false, partial: false, fetchedAt: NOW_ISO });
    expect(statusOf(result, 'FORECAST')).toEqual({
      source: 'FORECAST',
      status: 'OK',
      fetchedAt: NOW_ISO,
    });
  });

  it('I-STORE-2 a fresh window is served without an upstream call', async () => {
    const dates = await harness.seedWindow(LONDON, 'FORECAST', SEEDED_AT);

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    expect(harness.forecast.calls).toBe(0);
    expect(result).toMatchObject({ stale: false, fetchedAt: SEEDED_AT });
    expect(result.days.FORECAST?.map((day) => day.date)).toEqual(dates);
  });

  it('I-STORE-3 a window change refetches once and serves the shifted window', async () => {
    const seeded = await harness.seedWindow(LONDON, 'FORECAST', SEEDED_AT);
    harness.clock.advance(DAY_MS);

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    const served = result.days.FORECAST?.map((day) => day.date) ?? [];
    expect(harness.forecast.calls).toBe(1);
    expect(served).toHaveLength(7);
    expect(served.slice(0, 6)).toEqual(seeded.slice(1));
    expect(served[6]).toBe('2026-10-22');
  });

  it('I-INGEST-3 a timeout is retried once within the same job and the read is OK', async () => {
    harness.forecast.respond({ kind: 'fail', reason: 'timeout' }, { kind: 'ok' });

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    expect(harness.forecast.calls).toBe(2);
    expect(statusOf(result, 'FORECAST')).toEqual({
      source: 'FORECAST',
      status: 'OK',
      fetchedAt: NOW_ISO,
    });
    expect(runEvents(harness.logs).map((line) => [line.attempt, line.outcome])).toEqual([
      [1, 'timeout'],
      [2, 'ok'],
    ]);
  });

  it('I-INGEST-4 a failed refetch serves the stored window flagged stale', async () => {
    const dates = await seedStale(LONDON);
    harness.forecast.always({ kind: 'fail', reason: 'http' });

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    expect(result).toMatchObject({ stale: true, fetchedAt: SEEDED_AT });
    expect(statusOf(result, 'FORECAST')).toEqual({
      source: 'FORECAST',
      status: 'FAILED',
      fetchedAt: SEEDED_AT,
    });
    expect(result.days.FORECAST?.map((day) => day.date)).toEqual(dates);
    expect(await harness.repository.readLastError(LONDON.id)).not.toBeNull();
  });

  it('I-INGEST-11 a partial stored window and a failed refetch serve the present days flagged stale', async () => {
    const dates = await harness.seedWindow(LONDON, 'FORECAST', SEEDED_AT);
    const absent = dates[2] ?? '';
    await harness.redis.del(dayKey(LONDON, 'FORECAST', absent));
    harness.forecast.always({ kind: 'fail', reason: 'http' });

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    expect(result).toMatchObject({ stale: true, partial: false, fetchedAt: SEEDED_AT, dates });
    expect(statusOf(result, 'FORECAST')).toEqual({
      source: 'FORECAST',
      status: 'FAILED',
      fetchedAt: SEEDED_AT,
    });
    expect(result.days.FORECAST?.map((day) => day.date)).toEqual(
      dates.filter((date) => date !== absent),
    );
  });

  it('I-INGEST-12 a successful fetch with fewer days than requested logs a short-window warning', async () => {
    harness.forecast.always({ kind: 'ok', days: 5 });

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    expect(result.days.FORECAST).toHaveLength(5);
    expect(harness.logs).toContainEqual(
      expect.objectContaining({
        level: 40,
        event: 'ingest.short_window',
        source: 'FORECAST',
        requested: 8,
        received: 5,
      }),
    );
  });

  it("I-INGEST-14 stored days carry the adapter's fetchedAt, not the processor's clock", async () => {
    const fetchedAt = '2026-10-15T05:59:58.000Z';
    harness.forecast.always({ kind: 'ok', fetchedAt });

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    expect(result.fetchedAt).toBe(fetchedAt);
    expect(statusOf(result, 'FORECAST')?.fetchedAt).toBe(fetchedAt);
  });

  it('I-INGEST-5 a marine failure serves the forecast with partial: true and persists it', async () => {
    harness.marine.always({ kind: 'fail', reason: 'http' });

    const result = await harness.service.ensure(LONDON, ['FORECAST', 'MARINE']);

    expect(result).toMatchObject({ partial: true, stale: false });
    expect(statusOf(result, 'MARINE')).toEqual({
      source: 'MARINE',
      status: 'FAILED',
      fetchedAt: null,
    });
    expect(result.days.FORECAST).toHaveLength(7);
    expect(result.days.MARINE).toBeUndefined();
    const stored = await harness.repository.readWindow(LONDON.id, 'FORECAST', [
      ...(result.days.FORECAST ?? []).map((day) => day.date),
    ]);
    expect(stored.state).toBe('fresh');
  });

  it('I-INGEST-5 a malformed marine body is kept as the raw payload while the source fails', async () => {
    harness.marine.always({ kind: 'fail', reason: 'malformed', raw: { daily: 'drifted' } });

    const result = await harness.service.ensure(LONDON, ['FORECAST', 'MARINE']);

    expect(statusOf(result, 'MARINE')?.status).toBe('FAILED');
    const raw = await harness.redis.get(`forecast:raw:${LONDON.id}:MARINE`);
    expect(JSON.parse(raw ?? 'null')).toEqual({ daily: 'drifted' });
  });

  it('I-INGEST-6 an empty store and a failing forecast give UPSTREAM_UNAVAILABLE within 4.5 s', async () => {
    harness.forecast.always({ kind: 'fail', reason: 'timeout' });
    const started = performance.now();

    const failure: unknown = await harness.service
      .ensure(LONDON, ['FORECAST'])
      .catch((error: unknown) => error);

    expect(performance.now() - started).toBeLessThan(4_500);
    expect(failure).toBeInstanceOf(ForecastUnavailableError);
    expect(failure).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', retryAfterSeconds: 30 });
  });

  it('I-INGEST-7 each request fetches only the sources it needs', async () => {
    const first = await harness.service.ensure(LONDON, ['FORECAST']);
    const callsAfterFirst = [harness.forecast.calls, harness.marine.calls];

    const second = await harness.service.ensure(LONDON, ['FORECAST', 'MARINE']);

    expect(callsAfterFirst).toEqual([1, 0]);
    expect([harness.forecast.calls, harness.marine.calls]).toEqual([1, 1]);
    expect(statusOf(first, 'MARINE')).toEqual({
      source: 'MARINE',
      status: 'SKIPPED',
      fetchedAt: null,
    });
    expect(first.marineAvailability).toBeUndefined();
    expect(second.days.MARINE).toHaveLength(7);
    expect(second.marineAvailability).toBe('available');
  });

  it('I-INGEST-7 a marine window with no wave values reports marineAvailability absent', async () => {
    harness.marine.always({ kind: 'ok', template: 'marineInland' });

    const result = await harness.service.ensure(LONDON, ['FORECAST', 'MARINE']);

    expect(result.marineAvailability).toBe('absent');
    expect(result.partial).toBe(false);
  });

  it('I-INGEST-13 a malformed payload counts an upstream_drift anomaly per attempt', async () => {
    harness.marine.always({ kind: 'fail', reason: 'malformed', raw: { daily: 'drifted' } });
    const before = harness.anomalies.count('upstream_drift');

    await harness.service.ensure(LONDON, ['FORECAST', 'MARINE']);

    expect(harness.anomalies.count('upstream_drift') - before).toBe(2);
    expect(harness.logs).toContainEqual(
      expect.objectContaining({
        level: 40,
        metric: 'ranking_anomalies_total',
        type: 'upstream_drift',
      }),
    );
  });

  it('I-INGEST-8 every run logs an ingest.run event with duration and outcome', async () => {
    harness.marine.always({ kind: 'fail', reason: 'malformed' });

    await harness.service.ensure(LONDON, ['FORECAST', 'MARINE']);

    const events = runEvents(harness.logs);
    expect(events).toHaveLength(3);
    for (const event of events) {
      expect(event.locationId).toBe(LONDON.id);
      expect(typeof event.durationMs).toBe('number');
    }
    expect(
      events.map((event) => `${String(event.source)}:${String(event.outcome)}`).sort(),
    ).toEqual(['FORECAST:ok', 'MARINE:malformed', 'MARINE:malformed']);
  });

  it('I-INGEST-9 a failed run writes ingest:last-error with step, error and at', async () => {
    harness.forecast.always({ kind: 'fail', reason: 'http' });

    await harness.service.ensure(LONDON, ['FORECAST']).catch(() => undefined);

    expect(await harness.repository.readLastError(LONDON.id)).toEqual({
      step: 'fetch:FORECAST',
      error: 'http: fake failure',
      at: NOW_ISO,
    });
  });
});

describe('IngestService under a short cold-read bound', () => {
  let harness: IngestHarness;

  beforeAll(async () => {
    harness = await createIngestHarness({ COLD_READ_BOUND_MS: '300' });
  });

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('I-INGEST-10 an expired bound serves stored data flagged stale while the job runs on', async () => {
    const dates = await harness.seedWindow(LONDON, 'FORECAST', SEEDED_AT);
    await harness.redis.pexpire(dayKey(LONDON, 'FORECAST', dates[0] ?? ''), STALE_PTTL_MS);
    harness.forecast.always({ kind: 'hang' });
    const started = performance.now();

    const result = await harness.service.ensure(LONDON, ['FORECAST']);

    expect(performance.now() - started).toBeLessThan(1_000);
    expect(result.stale).toBe(true);
    expect(statusOf(result, 'FORECAST')).toEqual({
      source: 'FORECAST',
      status: 'FAILED',
      fetchedAt: SEEDED_AT,
    });
    // Let the hung job finish before the next reset.
    harness.forecast.always({ kind: 'ok' });
    harness.forecast.release();
    const job = { locationId: LONDON.id, source: 'FORECAST' as const, coordinates: LONDON };
    expect(await harness.queue.runOnce(job, 5_000)).toEqual({ kind: 'completed' });
  });
});
