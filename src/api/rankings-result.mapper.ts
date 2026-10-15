import type { LocationFacts } from '../location/index.js';
import type { ActivityRanking } from '../ranking/index.js';
import type { LocationRanking } from './api.types.js';
import type { ActivityRankingModel } from './models/activity-ranking.model.js';
import type { ActivityReasonModel } from './models/activity-reason.model.js';
import type { LocationModel } from './models/location.model.js';
import type { RankingsResultModel } from './models/rankings-result.model.js';

// The public fields of a location, also sent in the UPSTREAM_UNAVAILABLE error's extensions.
export function locationView(facts: LocationFacts): Omit<LocationModel, 'facts'> {
  return {
    id: facts.id,
    name: facts.name,
    region: facts.admin1 ?? null,
    country: facts.country,
    latitude: facts.latitude,
    longitude: facts.longitude,
    timezone: facts.timezone,
    elevation: facts.elevation ?? null,
  };
}

function toLocation(facts: LocationFacts): LocationModel {
  return { ...locationView(facts), facts };
}

function toRanking(ranking: ActivityRanking): ActivityRankingModel {
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

function unranked(rankings: readonly ActivityRanking[]): ActivityReasonModel[] {
  return rankings.flatMap(({ activity, status, reason }) =>
    status === 'APPLICABLE' || reason === null ? [] : [{ activity, reason }],
  );
}

// `now` stands in for fetchedAt only when no source was served, which no built-in activity allows.
export function toRankingsResult(
  { location, ensured, result }: LocationRanking,
  alternatives: readonly LocationFacts[],
  now: Date,
): RankingsResultModel {
  return {
    location: toLocation(location),
    rankings: result.rankings.map(toRanking),
    meta: {
      fetchedAt: ensured.fetchedAt ?? now.toISOString(),
      stale: ensured.stale,
      partial: ensured.partial,
      sources: ensured.sources,
      alternatives: alternatives.map(toLocation),
      unranked: unranked(result.rankings),
    },
  };
}
