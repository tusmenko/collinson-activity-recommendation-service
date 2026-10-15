import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../../test/setup/ranking-input.js';
import { ScoreEngine } from '../score-engine.service.js';
import { StaticRuleSetAdapter } from '../static-rule-set.adapter.js';
import { SkiingClassifier } from './skiing.classifier.js';

describe('SkiingClassifier', () => {
  it('U-SKI-1 a window with no snow depth value at all is NOT_APPLICABLE and says so', async () => {
    const { location, days } = rankingInput('hintertux');
    const withoutDepth = (days.FORECAST ?? []).map((day) => ({ ...day, snowDepth: null }));

    const output = await new SkiingClassifier(new ScoreEngine()).score({
      days: withoutDepth,
      facts: location,
      rules: new StaticRuleSetAdapter().get('SKIING'),
    });

    expect(output).toMatchObject({
      status: 'NOT_APPLICABLE',
      reason: 'snow depth unavailable on every day',
    });
    expect(output.days.every((day) => day.score === null)).toBe(true);
  });
});
