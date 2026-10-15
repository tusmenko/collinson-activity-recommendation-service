import { Injectable } from '@nestjs/common';

import { FactsRepositoryPort } from '../../location/index';
import type { LocationFacts } from '../../location/index';
import { ClassifierRegistry, RankingService, UnknownActivityError } from '../../ranking/index';
import { ForecastUnavailableError, IngestService, SOURCES } from '../../weather/index';
import type { EnsureResult, Source } from '../../weather/index';
import { UpstreamUnavailableError } from '../api.errors';
import type { ActivitySelection, LocationRanking, ServedMarine } from './rankings.types';

// Ranks one stored location (design D-9): sources the requested classifiers need, refresh on read,
// the marine fact reconciled with what was served (D-7), then the classifiers.
@Injectable()
export class LocationRankingService {
  constructor(
    private readonly registry: ClassifierRegistry,
    private readonly ingest: IngestService,
    private readonly ranking: RankingService,
    private readonly facts: FactsRepositoryPort,
  ) {}

  async rank(
    location: LocationFacts,
    activities: readonly string[] | undefined,
    requestId: string,
  ): Promise<LocationRanking> {
    const selection = this.select(activities);
    const ensured = await this.ensure(location, selection.sources);
    const current = await this.reconcileMarine(location, ensured.marineAvailability);
    const result = await this.ranking.rank({
      location: current,
      activities: selection.activities,
      dates: ensured.dates,
      days: ensured.days,
      sources: ensured.sources,
      fetchedAt: ensured.fetchedAt,
      requestId,
    });
    return { location: current, ensured, result };
  }

  // Omitted means every registered activity; the GraphQL enum already rejects unknown ids, this is defence in depth.
  private select(requested: readonly string[] | undefined): ActivitySelection {
    const activities = requested ?? this.registry.ids();
    const required = new Set<Source>();
    for (const id of activities) {
      const classifier = this.registry.get(id);
      if (classifier === undefined) {
        throw new UnknownActivityError(id);
      }
      classifier.requires.forEach((source) => required.add(source));
    }
    return { activities, sources: SOURCES.filter((source) => required.has(source)) };
  }

  private async ensure(location: LocationFacts, sources: readonly Source[]): Promise<EnsureResult> {
    try {
      return await this.ingest.ensure(location, sources);
    } catch (error) {
      if (error instanceof ForecastUnavailableError) {
        throw new UpstreamUnavailableError(location, error.retryAfterSeconds);
      }
      throw error;
    }
  }

  private async reconcileMarine(
    location: LocationFacts,
    served: ServedMarine,
  ): Promise<LocationFacts> {
    const previous = location.marineDataAvailable;
    if (served === undefined || served === previous) {
      return location;
    }
    await this.facts.setMarineAvailability(location.id, served);
    this.ranking.noteMarineAvailability(location, previous, served);
    return { ...location, marineDataAvailable: served };
  }
}
