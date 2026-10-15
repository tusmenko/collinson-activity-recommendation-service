import type { RuleSet } from './rule-set.schema';

// Thresholds behind a port so a configuration-service or database provider can replace the files (A-46).
export abstract class RuleSetProvider {
  // Recorded on every ranking event.
  abstract readonly version: string;
  abstract get(activity: string): RuleSet;
}
