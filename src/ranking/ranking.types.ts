import type { LocationFacts } from '../location/index.js';
import type { DaySignals, Source } from '../weather/index.js';
import type { ACTIVITIES } from './ranking.const.js';
import type { RuleSet } from './rules/rule-set.schema.js';

// The four built-in activities; classifier ids are plain strings so a fifth can register without editing this.
/** @public */
export type Activity = (typeof ACTIVITIES)[number];

/** @public */
export type ActivityStatus = 'APPLICABLE' | 'NOT_APPLICABLE' | 'UNAVAILABLE';

export type Effect = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface Factor {
  readonly signal: string;
  readonly value: number | null;
  readonly unit: string | null;
  readonly effect: Effect;
  readonly note: string | null;
}

export interface DayScore {
  // YYYY-MM-DD, local to the location.
  readonly date: string;
  // 0 to 100; null when the activity is not applicable or unavailable.
  readonly score: number | null;
  readonly factors: readonly Factor[];
}

// Design D-6.
export interface ClassifierInput {
  readonly days: readonly DaySignals[];
  readonly facts: LocationFacts;
  readonly rules: RuleSet;
}

export interface ClassifierOutput {
  readonly status: ActivityStatus;
  readonly reason?: string;
  readonly days: readonly DayScore[];
}

/** @public */
export type SourceStatus = 'OK' | 'FAILED' | 'SKIPPED';

/** @public */
export interface SourceReport {
  readonly source: Source;
  readonly status: SourceStatus;
  // ISO 8601.
  readonly fetchedAt: string | null;
}

// What the ingest hands to ranking; mirrors the weather module's ensure result without importing it.
export interface RankingInput {
  readonly location: LocationFacts;
  // Classifier ids; empty means every registered activity.
  readonly activities: readonly string[];
  readonly days: Readonly<Partial<Record<Source, readonly DaySignals[]>>>;
  readonly sources: readonly SourceReport[];
  readonly fetchedAt: string | null;
  readonly requestId: string;
}

/** @public */
export interface RankedDay extends DayScore {
  readonly signals: DaySignals;
}

export interface ActivityRanking {
  readonly activity: string;
  readonly status: ActivityStatus;
  readonly reason: string | null;
  readonly classifierVersion: string;
  readonly days: readonly RankedDay[];
}

export interface RankingResult {
  readonly rankings: readonly ActivityRanking[];
  readonly ruleSetVersion: string;
}

// The served days per source, as RankingInput carries them.
export type SourceDays = RankingInput['days'];
