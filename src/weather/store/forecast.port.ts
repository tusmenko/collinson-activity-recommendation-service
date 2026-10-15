import type { Source } from '../weather.types.js';
import type { LastIngestError, StoredDay, WindowRead } from './store.types.js';

// The forecast cache and the ingest operational keys (design D-4).
export abstract class ForecastRepositoryPort {
  // Freshness is a PTTL threshold: a key is stale once PTTL < RETENTION_TTL - FRESHNESS_TTL.
  abstract readWindow(
    locationId: string,
    source: Source,
    dates: readonly string[],
  ): Promise<WindowRead>;

  // One key per day at RETENTION_TTL plus the raw payload, in one pipeline.
  abstract writeWindow(
    locationId: string,
    source: Source,
    days: readonly StoredDay[],
    raw: unknown,
  ): Promise<void>;

  abstract writeLastError(locationId: string, entry: LastIngestError): Promise<void>;

  abstract readLastError(locationId: string): Promise<LastIngestError | null>;

  // Outbound calls made on a UTC date; the counter expires after two days.
  abstract incrementDailyCounter(date: string): Promise<number>;
}
