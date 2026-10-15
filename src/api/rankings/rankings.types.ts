import type { LocationFacts } from '../../location/index';
import type { RankingResult } from '../../ranking/index';
import type { EnsureResult, Source } from '../../weather/index';

// One location ranked: the facts as stored after the marine fact was reconciled, the served data and the scores.
export interface LocationRanking {
  readonly location: LocationFacts;
  readonly ensured: EnsureResult;
  readonly result: RankingResult;
}

// Activity ids to rank, and the sources their classifiers need.
export interface ActivitySelection {
  readonly activities: readonly string[];
  readonly sources: readonly Source[];
}

// What the ingest served for the marine fact; undefined when MARINE was not served.
export type ServedMarine = EnsureResult['marineAvailability'];
