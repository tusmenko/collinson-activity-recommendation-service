import { Injectable } from '@nestjs/common';

import { ConfigService } from '../../infra/index.js';
import { IngestQueue } from '../queue/ingest.queue.js';
import { ForecastRepositoryPort } from '../store/forecast.port.js';
import { SOURCES } from '../weather.const.js';
import { ForecastUnavailableError } from '../weather.errors.js';
import type { DaySignals, Source } from '../weather.types.js';
import type { EnsureLocation, EnsureResult, Served } from './ingest.types.js';
import { fromRead, marineAvailabilityOf, oldestFetchedAt, skipped } from './ingest.util.js';
import { WindowService } from './window.service.js';

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
