import { ActivityRankingsResolver } from './activity-rankings.resolver.js';
import { DayScoreResolver } from './day-score.resolver.js';
import { LocationResolver } from './location.resolver.js';
import { MetaResolver } from './meta.resolver.js';

// The module's providers and the schema snapshot test build from this one list.
export const API_RESOLVERS = [
  ActivityRankingsResolver,
  LocationResolver,
  MetaResolver,
  DayScoreResolver,
] as const;
