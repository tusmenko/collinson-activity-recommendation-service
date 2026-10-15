import type { IncomingMessage, ServerResponse } from 'node:http';

import type { LocationFacts } from '../location/index.js';
import type { RankingResult } from '../ranking/index.js';
import type { EnsureResult, Source } from '../weather/index.js';

// What every resolver and the throttler guard see; built once per HTTP request.
export interface GraphqlContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  // From x-request-id, or generated; carried into the ranking event (D-7).
  readonly requestId: string;
}

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
