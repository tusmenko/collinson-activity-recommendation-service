import { InvalidRuleSetError } from '../ranking.errors.js';
import { RuleSetSchema } from './rule-set.schema.js';
import type { RuleSet } from './rule-set.schema.js';

export function parseRuleSet(activity: string, file: unknown): RuleSet {
  const parsed = RuleSetSchema.safeParse(file);
  if (!parsed.success) {
    throw new InvalidRuleSetError(activity, parsed.error.message);
  }
  return parsed.data;
}
