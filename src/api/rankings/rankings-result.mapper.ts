import { Injectable } from '@nestjs/common';

import type { LocationFacts } from '../../location/index.js';
import type { ActivityRanking } from '../../ranking/index.js';
import { locationView } from '../api.util.js';
import type { ActivityRankingModel } from '../models/activity-ranking.model.js';
import type { ActivityReasonModel } from '../models/activity-reason.model.js';
import type { LocationModel } from '../models/location.model.js';
import type { RankingsResultModel } from '../models/rankings-result.model.js';
import type { LocationRanking } from './rankings.types.js';

// A ranked location to the GraphQL result shape (design D-3).
@Injectable()
export class RankingsResultMapper {
  // `now` stands in for fetchedAt only when no source was served, which no built-in activity allows.
  toResult(
    { location, ensured, result }: LocationRanking,
    alternatives: readonly LocationFacts[],
    now: Date,
  ): RankingsResultModel {
    return {
      location: this.toLocation(location),
      rankings: result.rankings.map((ranking) => this.toRanking(ranking)),
      meta: {
        fetchedAt: ensured.fetchedAt ?? now.toISOString(),
        stale: ensured.stale,
        partial: ensured.partial,
        sources: ensured.sources,
        alternatives: alternatives.map((facts) => this.toLocation(facts)),
        unranked: this.unranked(result.rankings),
      },
    };
  }

  private toLocation(facts: LocationFacts): LocationModel {
    return { ...locationView(facts), facts };
  }

  private toRanking(ranking: ActivityRanking): ActivityRankingModel {
    return {
      activity: ranking.activity,
      status: ranking.status,
      days: ranking.days.map(({ date, score, factors, signals }) => ({
        date,
        score,
        factors,
        signals,
      })),
    };
  }

  private unranked(rankings: readonly ActivityRanking[]): ActivityReasonModel[] {
    return rankings.flatMap(({ activity, status, reason }) =>
      status === 'APPLICABLE' || reason === null ? [] : [{ activity, reason }],
    );
  }
}
