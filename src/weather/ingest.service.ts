import { Injectable } from '@nestjs/common';

import { ConfigService } from '../infra/index.js';
import { ForecastRepositoryPort } from './forecast.port.js';
import { IngestQueue } from './ingest.queue.js';
import { SOURCES } from './weather.const.js';
import { ForecastUnavailableError } from './weather.errors.js';
import type {
  DaySignals,
  EnsureLocation,
  EnsureResult,
  MarineAvailability,
  Source,
  SourceStatus,
  WindowRead,
} from './weather.types.js';
import { WindowService } from './window.service.js';

interface Served {
  readonly status: SourceStatus;
  // null when the source has nothing to serve.
  readonly days: readonly DaySignals[] | null;
  readonly stale: boolean;
}

function skipped(source: Source): Served {
  return { status: { source, status: 'SKIPPED', fetchedAt: null }, days: null, stale: false };
}

function fromRead(source: Source, read: WindowRead, refreshFailed: boolean): Served {
  return {
    status: { source, status: refreshFailed ? 'FAILED' : 'OK', fetchedAt: read.fetchedAt },
    days: read.days.map((day) => day.signals),
    stale: refreshFailed,
  };
}

function oldestFetchedAt(served: readonly Served[]): string | null {
  const stamps = served.flatMap(({ status }) =>
    status.fetchedAt === null ? [] : [status.fetchedAt],
  );
  return stamps.length === 0 ? null : stamps.reduce((min, stamp) => (stamp < min ? stamp : min));
}

// Inland points answer with every wave value null: absence of marine data, not a failure (D-7).
function marineAvailabilityOf(days: readonly DaySignals[]): MarineAvailability {
  const hasWaves = days.some(
    (day) => day.waveHeight !== null || day.wavePeriod !== null || day.swellHeight !== null,
  );
  return hasWaves ? 'available' : 'absent';
}

// Refresh on read (design D-4, D-8): a fresh window is served as stored; a stale or missing one
// waits for its single-flight job under COLD_READ_BOUND_MS, then whatever the store holds is served.
@Injectable()
export class IngestService {
  constructor(
    private readonly repository: ForecastRepositoryPort,
    private readonly queue: IngestQueue,
    private readonly windows: WindowService,
    private readonly config: ConfigService,
  ) {}

  async ensure(location: EnsureLocation, sources: readonly Source[]): Promise<EnsureResult> {
    const dates = this.windows.dates(location.timezone);
    const served = await Promise.all(
      SOURCES.map((source) =>
        sources.includes(source)
          ? this.serve(location, source, dates)
          : Promise.resolve(skipped(source)),
      ),
    );
    const days: Partial<Record<Source, readonly DaySignals[]>> = {};
    served.forEach(({ status, days: sourceDays }) => {
      if (sourceDays !== null) {
        days[status.source] = sourceDays;
      }
    });
    // Forecast is mandatory, marine optional (DF-6).
    if (sources.includes('FORECAST') && days.FORECAST === undefined) {
      throw new ForecastUnavailableError();
    }
    return {
      fetchedAt: oldestFetchedAt(served),
      stale: served.some((entry) => entry.stale),
      partial: sources.includes('MARINE') && days.MARINE === undefined,
      sources: served.map((entry) => entry.status),
      days,
      ...(days.MARINE === undefined
        ? {}
        : { marineAvailability: marineAvailabilityOf(days.MARINE) }),
    };
  }

  private async serve(location: EnsureLocation, source: Source, dates: string[]): Promise<Served> {
    const stored = await this.repository.readWindow(location.id, source, dates);
    if (stored.state === 'fresh') {
      return fromRead(source, stored, false);
    }
    // The job outcome is not needed: the store after the wait is the single source of truth.
    await this.queue.runOnce(
      {
        locationId: location.id,
        source,
        coordinates: { latitude: location.latitude, longitude: location.longitude },
      },
      this.config.get('COLD_READ_BOUND_MS'),
    );
    const read = await this.repository.readWindow(location.id, source, dates);
    switch (read.state) {
      case 'fresh':
        return fromRead(source, read, false);
      case 'stale':
        return fromRead(source, read, true);
      case 'missing':
        return { status: { source, status: 'FAILED', fetchedAt: null }, days: null, stale: false };
    }
  }
}
