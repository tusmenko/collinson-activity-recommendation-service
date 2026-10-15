import type { LocationFacts } from '../../location/index.js';
import type { RankingResult } from '../../ranking/index.js';
import type { EnsureResult, Source } from '../../weather/index.js';

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
