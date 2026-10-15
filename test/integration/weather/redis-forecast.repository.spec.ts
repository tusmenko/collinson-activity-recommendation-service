import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { RedisForecastRepository } from '../../../src/weather/store/redis-forecast.repository';
import { testConfig } from '../../setup/adapter-deps';
import { templateDay } from '../../setup/fakes/fake-weather-source';
import { createTestRedis, flushTestKeys } from '../../setup/redis';

const redis = createTestRedis();
const repository = new RedisForecastRepository(redis, testConfig());

const HOUR_MS = 3_600_000;
const DATES = ['2026-10-15', '2026-10-16', '2026-10-17'];
const OLDER = '2026-10-15T00:00:00.000Z';
const NEWER = '2026-10-15T06:00:00.000Z';

function storedDay(
  date: string,
  fetchedAt: string,
): {
  signals: ReturnType<typeof templateDay>;
  fetchedAt: string;
  providerSchemaVersion: string;
} {
  return { signals: templateDay('FORECAST', date), fetchedAt, providerSchemaVersion: 'fake-1' };
}

describe('RedisForecastRepository', () => {
  beforeEach(async () => {
    await flushTestKeys(redis);
  });

  afterAll(async () => {
    await flushTestKeys(redis);
    await redis.quit();
  });

  it('I-STORE-1 writes one key per day at RETENTION_TTL plus the raw payload', async () => {
    await repository.writeWindow('loc', 'FORECAST', [storedDay(DATES[0] ?? '', NEWER)], { a: 1 });

    const ttl = await redis.pttl(`forecast:v1:loc:FORECAST:${DATES[0] ?? ''}`);
    expect(ttl).toBeGreaterThan(23 * HOUR_MS);
    expect(ttl).toBeLessThanOrEqual(24 * HOUR_MS);
    expect(JSON.parse((await redis.get('forecast:raw:loc:FORECAST')) ?? 'null')).toEqual({ a: 1 });
  });

  it('I-STORE-1 a complete window above the threshold reads fresh, in date order, oldest fetchedAt', async () => {
    const [first = '', second = '', third = ''] = DATES;
    await repository.writeWindow(
      'loc',
      'FORECAST',
      [storedDay(third, NEWER), storedDay(first, NEWER), storedDay(second, OLDER)],
      {},
    );

    const read = await repository.readWindow('loc', 'FORECAST', DATES);

    expect(read.state).toBe('fresh');
    expect(read.fetchedAt).toBe(OLDER);
    expect(read.days.map((day) => day.signals.date)).toEqual(DATES);
  });

  it('I-STORE-1 one key below RETENTION_TTL - FRESHNESS_TTL makes the window stale', async () => {
    await repository.writeWindow(
      'loc',
      'FORECAST',
      DATES.map((date) => storedDay(date, NEWER)),
      {},
    );
    await redis.pexpire(`forecast:v1:loc:FORECAST:${DATES[1] ?? ''}`, 17 * HOUR_MS);

    const read = await repository.readWindow('loc', 'FORECAST', DATES);

    expect(read.state).toBe('stale');
    expect(read.days).toHaveLength(3);
  });

  it('I-STORE-3 a missing date makes the window missing and keeps the present days', async () => {
    await repository.writeWindow('loc', 'FORECAST', [storedDay(DATES[0] ?? '', NEWER)], {});

    const read = await repository.readWindow('loc', 'FORECAST', DATES);

    expect(read).toMatchObject({ state: 'missing', fetchedAt: NEWER });
    expect(read.days).toHaveLength(1);
  });

  it('I-STORE-3 an empty store reads missing with no fetchedAt', async () => {
    expect(await repository.readWindow('loc', 'MARINE', DATES)).toEqual({
      state: 'missing',
      days: [],
      fetchedAt: null,
    });
  });

  it('I-INGEST-9 the last error is kept for seven days', async () => {
    const entry = { step: 'fetch:MARINE', error: 'http: HTTP 500', at: NEWER };

    await repository.writeLastError('loc', entry);

    expect(await repository.readLastError('loc')).toEqual(entry);
    expect(await redis.pttl('ingest:last-error:loc')).toBeGreaterThan(6 * 24 * HOUR_MS);
    expect(await repository.readLastError('other')).toBeNull();
  });

  it('I-QUEUE-3 the daily counter counts up and expires after two days', async () => {
    const counts = [
      await repository.incrementDailyCounter('2026-10-15'),
      await repository.incrementDailyCounter('2026-10-15'),
    ];

    expect(counts).toEqual([1, 2]);
    const ttl = await redis.pttl('fairuse:day:2026-10-15');
    expect(ttl).toBeGreaterThan(47 * HOUR_MS);
    expect(ttl).toBeLessThanOrEqual(48 * HOUR_MS);
  });
});
