import indoorSightseeing from './indoor-sightseeing/indoor-sightseeing.rules.json' with { type: 'json' };
import outdoorSightseeing from './outdoor-sightseeing/outdoor-sightseeing.rules.json' with { type: 'json' };
import { RULE_SET_SCHEMA_VERSION } from './ranking.const.js';
import { InvalidRuleSetError, UnknownActivityError } from './ranking.errors.js';
import { RuleSetProvider } from './rule-set.port.js';
import { RuleSetSchema } from './rule-set.schema.js';
import type { RuleSet } from './rule-set.schema.js';
import skiing from './skiing/skiing.rules.json' with { type: 'json' };
import surfing from './surfing/surfing.rules.json' with { type: 'json' };

// One file per activity, next to its classifier; a new activity adds its line here.
const RULE_FILES: Readonly<Record<string, unknown>> = {
  SKIING: skiing,
  SURFING: surfing,
  OUTDOOR_SIGHTSEEING: outdoorSightseeing,
  INDOOR_SIGHTSEEING: indoorSightseeing,
};

function parse(activity: string, file: unknown): RuleSet {
  const parsed = RuleSetSchema.safeParse(file);
  if (!parsed.success) {
    throw new InvalidRuleSetError(activity, parsed.error.message);
  }
  return parsed.data;
}

// Rule files bundled with the build, validated once at construction so a bad threshold stops startup.
export class StaticRuleSetAdapter extends RuleSetProvider {
  readonly version: string;
  private readonly sets: ReadonlyMap<string, RuleSet>;

  constructor(files: Readonly<Record<string, unknown>> = RULE_FILES) {
    super();
    this.sets = new Map(
      Object.entries(files).map(([activity, file]) => [activity, parse(activity, file)]),
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
