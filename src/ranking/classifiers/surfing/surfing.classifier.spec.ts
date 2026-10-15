import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../../../test/setup/ranking-input';
import { ScoreEngine } from '../../engine/score-engine.service';
import { mergeDays } from '../../ranking.util';
import { StaticRuleSetAdapter } from '../../rules/static-rule-set.adapter';
import { SurfingClassifier } from './surfing.classifier';

const classifier = new SurfingClassifier(new ScoreEngine());
const rules = new StaticRuleSetAdapter().get('SURFING');

function input(place: 'biarritz' | 'london') {
  const { location, days } = rankingInput(place);
  return { facts: location, days: mergeDays(days, 7), rules };
}

describe('SurfingClassifier', () => {
  it('U-SURF-1 marine nulls on every day give NOT_APPLICABLE with a reason and no scores', async () => {
    const output = await classifier.score(input('london'));

    expect(output).toMatchObject({
      status: 'NOT_APPLICABLE',
      reason: 'no marine data at this location',
    });
    expect(output.days).toHaveLength(7);
    expect(output.days.every((day) => day.score === null)).toBe(true);
  });

  it('U-SURF-2 Biarritz swell is APPLICABLE and scored every day', async () => {
    const output = await classifier.score(input('biarritz'));

    expect(output.status).toBe('APPLICABLE');
    expect(output.reason).toBeUndefined();
    expect(output.days.every((day) => day.score !== null)).toBe(true);
  });

  it('U-SURF-2 a single day with a wave value keeps the window applicable', async () => {
    const london = input('london');
    const [first, ...rest] = london.days;
    const days = first === undefined ? [] : [{ ...first, wavePeriod: 8 }, ...rest];

    const output = await classifier.score({ ...london, days });

    expect(output.status).toBe('APPLICABLE');
  });

  it('U-SURF-2 declares the sources it needs and its version', () => {
    expect(classifier.id).toBe('SURFING');
    expect(classifier.version).toBe('1.0.0');
    expect(classifier.requires).toEqual(['FORECAST', 'MARINE']);
  });
});
