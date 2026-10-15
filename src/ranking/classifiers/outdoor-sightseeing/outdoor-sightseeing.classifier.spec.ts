import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../../../test/setup/ranking-input';
import { ScoreEngine } from '../../engine/score-engine.service';
import { StaticRuleSetAdapter } from '../../rules/static-rule-set.adapter';
import { OutdoorSightseeingClassifier } from './outdoor-sightseeing.classifier';

const classifier = new OutdoorSightseeingClassifier(new ScoreEngine());
const rules = new StaticRuleSetAdapter().get('OUTDOOR_SIGHTSEEING');

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
});
