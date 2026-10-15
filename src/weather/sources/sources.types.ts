import type { SourceFetchOutcome } from '../weather.types.js';

export type SourceFetchFailure = Extract<SourceFetchOutcome, { kind: 'failed' }>;

// One Open-Meteo daily or hourly series; archive and inland points carry nulls.
export type Series = readonly (number | null)[];
