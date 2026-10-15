import type { Factor } from '../ranking.types';
import type { FactorRule } from '../rules/rule-set.schema';

// Outcome of a rule set's applicability gate; `max` is the window's highest value of the gate signal.
export type GateResult =
  | { readonly open: true }
  | { readonly open: false; readonly min: number; readonly max: number | null };

// Outcome of a rule set's place applicability, checked before any signal gate; `reason` is the API's text.
export type PlaceGateResult =
  { readonly applicable: true } | { readonly applicable: false; readonly reason: string };

// A factor with the rule that produced it and its 0/50/100 score; null when the signal has no value.
export interface WeighedFactor {
  readonly factor: Factor;
  readonly rule: FactorRule;
  readonly score: number | null;
}
