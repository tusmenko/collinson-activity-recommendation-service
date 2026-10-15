import { ActivityRankingsResolver } from './activity-rankings.resolver';
import { DayScoreResolver } from './day-score.resolver';
import { LocationResolver } from './location.resolver';
import { MetaResolver } from './meta.resolver';

// The module's providers and the schema snapshot test build from this one list.
export const API_RESOLVERS = [
  ActivityRankingsResolver,
  LocationResolver,
  MetaResolver,
  DayScoreResolver,
] as const;
