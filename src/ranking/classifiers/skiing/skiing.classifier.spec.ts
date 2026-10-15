import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../../../test/setup/ranking-input';
import { ScoreEngine } from '../../engine/score-engine.service';
import { parseRuleSet } from '../../rules/rules.util';
import { SkiingClassifier } from './skiing.classifier';

const classifier = new SkiingClassifier(new ScoreEngine());
const rules = parseRuleSet('SKIING', classifier.ruleFile);

describe('SkiingClassifier', () => {
  it('U-SKI-1 a window with no snow depth value at all is NOT_APPLICABLE and says so', async () => {
    const { location, days } = rankingInput('hintertux');
    const withoutDepth = (days.FORECAST ?? []).map((day) => ({ ...day, snowDepth: null }));

    const output = await classifier.score({
      days: withoutDepth,
      facts: location,
      rules,
    });

    expect(output).toMatchObject({
      status: 'NOT_APPLICABLE',
      reason: 'snow depth unavailable on every day',
    });
    expect(output.days.every((day) => day.score === null)).toBe(true);
  });

  it('U-SKI-4 a snowy window below 800 m is NOT_APPLICABLE and the reason names the elevation', async () => {
    const { location, days } = rankingInput('london');
    const snowy = (days.FORECAST ?? []).map((day) => ({ ...day, snowDepth: 50, snowfall: 10 }));

    const output = await classifier.score({
      days: snowy,
      facts: location,
      rules,
    });

    expect(location.elevation).toBe(25);
    expect(output).toMatchObject({
      status: 'NOT_APPLICABLE',
      reason: 'elevation 25 m is below 800 m',
    });
    expect(output.days.every((day) => day.score === null)).toBe(true);
  });

  it('U-SKI-4 a place with no known elevation is NOT_APPLICABLE and says so', async () => {
    const { location, days } = rankingInput('chamonix-january');
    const { elevation: _elevation, ...unknown } = location;

    const output = await classifier.score({
      days: days.FORECAST ?? [],
      facts: unknown,
      rules,
    });

    expect(output).toMatchObject({ status: 'NOT_APPLICABLE', reason: 'elevation unknown' });
  });

  it('U-SKI-5 Chamonix at 1060 m with the January window stays APPLICABLE', async () => {
    const { location, days } = rankingInput('chamonix-january');

    const output = await classifier.score({
      days: days.FORECAST ?? [],
      facts: location,
      rules,
    });

    expect(location.elevation).toBe(1060);
    expect(output.status).toBe('APPLICABLE');
  });
});
