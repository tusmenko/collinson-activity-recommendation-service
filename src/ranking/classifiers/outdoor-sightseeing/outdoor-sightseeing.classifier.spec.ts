import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../../../test/setup/ranking-input';
import { ScoreEngine } from '../../engine/score-engine.service';
import { parseRuleSet } from '../../rules/rules.util';
import { OutdoorSightseeingClassifier } from './outdoor-sightseeing.classifier';

const classifier = new OutdoorSightseeingClassifier(new ScoreEngine());
const rules = parseRuleSet('OUTDOOR_SIGHTSEEING', classifier.ruleFile);

describe('OutdoorSightseeingClassifier', () => {
  it('U-RANK-13 always APPLICABLE with every day scored from 0 to 100', async () => {
    const { location, days } = rankingInput('springfield');

    const output = await classifier.score({ facts: location, days: days.FORECAST ?? [], rules });

    expect(output.status).toBe('APPLICABLE');
    expect(output.days.map((day) => day.score)).not.toContain(null);
    expect(output.days.every(({ score }) => score !== null && score >= 0 && score <= 100)).toBe(
      true,
    );
  });

  it('U-RANK-13 needs the forecast only', () => {
    expect(classifier.id).toBe('OUTDOOR_SIGHTSEEING');
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
