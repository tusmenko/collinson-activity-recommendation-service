import { UnknownActivityError } from '../ranking.errors';
import { RuleSetProvider } from './rule-set.port';
import type { RuleSet } from './rule-set.schema';
import { RULE_SET_SCHEMA_VERSION } from './rules.const';
import { parseRuleSet } from './rules.util';

// The registered classifiers' bundled rule files, validated once at construction so a bad threshold stops startup.
export class StaticRuleSetAdapter extends RuleSetProvider {
  readonly version: string;
  private readonly sets: ReadonlyMap<string, RuleSet>;

  constructor(files: Readonly<Record<string, unknown>>) {
    super();
    this.sets = new Map(
      Object.entries(files).map(([activity, file]) => [activity, parseRuleSet(activity, file)]),
    );
    const parts = [...this.sets].map(([activity, rules]) => `${activity}@${rules.version}`);
    this.version = [RULE_SET_SCHEMA_VERSION, ...parts].join('+');
  }

  get(activity: string): RuleSet {
    const rules = this.sets.get(activity);
    if (rules === undefined) {
      throw new UnknownActivityError(activity);
    }
    return rules;
  }
}
