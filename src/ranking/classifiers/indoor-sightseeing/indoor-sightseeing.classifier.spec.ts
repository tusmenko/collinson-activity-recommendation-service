import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../../../test/setup/ranking-input';
import { ScoreEngine } from '../../engine/score-engine.service';
import { parseRuleSet } from '../../rules/rules.util';
import { IndoorSightseeingClassifier } from './indoor-sightseeing.classifier';

const classifier = new IndoorSightseeingClassifier(new ScoreEngine());
const rules = parseRuleSet('INDOOR_SIGHTSEEING', classifier.ruleFile);

describe('IndoorSightseeingClassifier', () => {
  it('U-RANK-12 always APPLICABLE, every day scored and never below the floor', async () => {
    const { location, days } = rankingInput('springfield');

    const output = await classifier.score({ facts: location, days: days.FORECAST ?? [], rules });

    expect(output.status).toBe('APPLICABLE');
    expect(output.days).toHaveLength(days.FORECAST?.length ?? 0);
    expect(output.days.every((day) => (day.score ?? -1) >= (rules.floor ?? 0))).toBe(true);
  });

  it('U-RANK-12 needs the forecast only', () => {
    expect(classifier.id).toBe('INDOOR_SIGHTSEEING');
    expect(classifier.version).toBe('1.0.0');
    expect(classifier.requires).toEqual(['FORECAST']);
  });
  it('U-RANK-14 a minimum elevation in its rules is honoured: below it the activity is NOT_APPLICABLE', async () => {
    const { location, days } = rankingInput('london');
    const elevated = { ...rules, applicability: { minElevation: 800, note: 'test' } };

    const output = await classifier.score({
      facts: location,
      days: days.FORECAST ?? [],
      rules: elevated,
    });

    expect(output).toMatchObject({
      status: 'NOT_APPLICABLE',
      reason: 'elevation 25 m is below 800 m',
    });
    expect(output.days.every((day) => day.score === null)).toBe(true);
  });
});
