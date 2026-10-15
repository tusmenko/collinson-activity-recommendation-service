import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import { ConfigService } from '../infra/index.js';
import { FAIR_USE_COUNTER_TTL_MS, LAST_ERROR_TTL_MS } from './weather.const.js';
import { ForecastRepositoryPort } from './forecast.port.js';
import type {
  LastIngestError,
  Source,
  StoredDay,
  WindowRead,
  WindowState,
} from './weather.types.js';

const dayKey = (locationId: string, source: Source, date: string): string =>
  `forecast:v1:${locationId}:${source}:${date}`;
const rawKey = (locationId: string, source: Source): string =>
  `forecast:raw:${locationId}:${source}`;
const lastErrorKey = (locationId: string): string => `ingest:last-error:${locationId}`;
const counterKey = (date: string): string => `fairuse:day:${date}`;

// ISO 8601 strings in UTC compare correctly as text.
function oldest(days: readonly StoredDay[]): string | null {
  return days.reduce<string | null>(
    (min, day) => (min === null || day.fetchedAt < min ? day.fetchedAt : min),
    null,
  );
}

@Injectable()
export class RedisForecastRepository extends ForecastRepositoryPort {
  constructor(
    private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async readWindow(
    locationId: string,
    source: Source,
    dates: readonly string[],
  ): Promise<WindowRead> {
    const keys = dates.map((date) => dayKey(locationId, source, date));
    const pipeline = this.redis.pipeline().mget(keys);
    keys.forEach((key) => pipeline.pttl(key));
    const replies = (await pipeline.exec()) ?? [];
    const values = (replies[0]?.[1] ?? []) as (string | null)[];
    const ttls = replies.slice(1).map(([, ttl]) => ttl as number);
    // Values are written only by this repository, so they are trusted on read.
    const days = values.flatMap((value) =>
      value === null ? [] : [JSON.parse(value) as StoredDay],
    );
    return { state: this.stateOf(days.length < dates.length, ttls), days, fetchedAt: oldest(days) };
  }

  async writeWindow(
    locationId: string,
    source: Source,
    days: readonly StoredDay[],
    raw: unknown,
  ): Promise<void> {
    const retention = this.config.get('RETENTION_TTL');
    const pipeline = this.redis.pipeline();
    days.forEach((day) => {
      pipeline.set(
        dayKey(locationId, source, day.signals.date),
        JSON.stringify(day),
        'PX',
        retention,
      );
    });
    pipeline.set(rawKey(locationId, source), JSON.stringify(raw), 'PX', retention);
    await pipeline.exec();
  }

  async writeLastError(locationId: string, entry: LastIngestError): Promise<void> {
    await this.redis.set(lastErrorKey(locationId), JSON.stringify(entry), 'PX', LAST_ERROR_TTL_MS);
  }

  async readLastError(locationId: string): Promise<LastIngestError | null> {
    const value = await this.redis.get(lastErrorKey(locationId));
    return value === null ? null : (JSON.parse(value) as LastIngestError);
  }

  async incrementDailyCounter(date: string): Promise<number> {
    const count = await this.redis.incr(counterKey(date));
    if (count === 1) {
      await this.redis.pexpire(counterKey(date), FAIR_USE_COUNTER_TTL_MS);
    }
    return count;
  }

  private stateOf(anyMissing: boolean, ttls: readonly number[]): WindowState {
    if (anyMissing) {
      return 'missing';
    }
    const threshold = this.config.get('RETENTION_TTL') - this.config.get('FRESHNESS_TTL');
    return ttls.some((ttl) => ttl < threshold) ? 'stale' : 'fresh';
  }
}
