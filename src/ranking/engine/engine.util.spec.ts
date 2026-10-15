import { describe, expect, it } from 'vitest';

import type { DaySignals } from '../../weather/index';
import { noSignals } from '../ranking.util';
import type { FactorRule, RuleSet } from '../rules/rule-set.schema';
import { bound, weigh } from './engine.util';

const WIND: FactorRule = {
  signal: 'windMax',
  unit: 'km/h',
  weight: 2,
  good: [{ gte: 5, lt: 20 }],
  poor: [{ gt: 30, lte: 200 }],
  note: 'wind',
};

const GUSTS: FactorRule = { ...WIND, signal: 'windGusts', note: 'gusts' };

const RULES: RuleSet = { version: '1.0.0', factors: [WIND] };

function windy(windMax: number | null): DaySignals {
  return { ...noSignals('2026-10-15'), windMax };
}

function gusty(windGusts: number): DaySignals {
  return { ...noSignals('2026-10-15'), windGusts };
}

describe('engine helpers', () => {
  it('U-RANK-3 a value in a good band is POSITIVE at 100, honouring every bound', () => {
    expect(weigh(windy(5), WIND)).toMatchObject({
      score: 100,
      factor: { signal: 'windMax', value: 5, unit: 'km/h', effect: 'POSITIVE', note: 'wind' },
    });
    expect(weigh(windy(20), WIND)).toMatchObject({ score: 50, factor: { effect: 'NEUTRAL' } });
  });

  it('U-RANK-3 a value in a poor band is NEGATIVE at 0; between the bands NEUTRAL at 50', () => {
    expect(weigh(windy(200), WIND)).toMatchObject({ score: 0, factor: { effect: 'NEGATIVE' } });
    expect(weigh(windy(30), WIND)).toMatchObject({ score: 50, factor: { effect: 'NEUTRAL' } });
    expect(weigh(windy(201), WIND)).toMatchObject({ score: 50 });
    expect(weigh(windy(4), WIND)).toMatchObject({ score: 50 });
  });

  it('U-RANK-3 a missing value has no score and a NEUTRAL effect', () => {
    expect(weigh(windy(null), WIND)).toMatchObject({
      score: null,
      factor: { value: null, effect: 'NEUTRAL' },
    });
  });

  it('U-RANK-3 without a cap or floor the mean stands', () => {
    expect(bound(73, [weigh(windy(100), WIND)], RULES)).toBe(73);
  });

  it('U-RANK-3 a heavy poor factor caps the day; a light one does not', () => {
    const capped: RuleSet = { ...RULES, poorCap: { max: 30, minWeight: 2, note: 'cap' } };
    const tooLight: RuleSet = { ...RULES, poorCap: { max: 30, minWeight: 3, note: 'cap' } };
    const poor = [weigh(windy(100), WIND)];

    expect(bound(73, poor, capped)).toBe(30);
    expect(bound(20, poor, capped)).toBe(20);
    expect(bound(73, poor, tooLight)).toBe(73);
    expect(bound(73, [weigh(windy(10), WIND)], capped)).toBe(73);
  });

  it('U-RANK-3 the floor lifts a low day, after the cap', () => {
    const floored: RuleSet = {
      ...RULES,
      floor: 40,
      poorCap: { max: 30, minWeight: 1, note: 'cap' },
    };

    expect(bound(73, [weigh(windy(100), WIND)], floored)).toBe(40);
    expect(bound(90, [], floored)).toBe(90);
  });

  it('U-RANK-17 a heavy good factor lifts the day to the boost minimum; a light one or a high mean does not', () => {
    const boosted: RuleSet = { ...RULES, goodBoost: { min: 60, minWeight: 2, note: 'boost' } };
    const tooLight: RuleSet = { ...RULES, goodBoost: { min: 60, minWeight: 3, note: 'boost' } };
    const good = [weigh(windy(10), WIND)];

    expect(bound(25, good, boosted)).toBe(60);
    expect(bound(85, good, boosted)).toBe(85);
    expect(bound(25, good, tooLight)).toBe(25);
    expect(bound(25, [weigh(windy(25), WIND)], boosted)).toBe(25);
  });

  it('U-RANK-17 order: the cap wins over the boost, then the floor lifts what is left', () => {
    const all: RuleSet = {
      ...RULES,
      factors: [WIND, GUSTS],
      floor: 40,
      poorCap: { max: 30, minWeight: 2, note: 'cap' },
      goodBoost: { min: 60, minWeight: 2, note: 'boost' },
    };
    const goodWindPoorGusts = [weigh(windy(10), WIND), weigh(gusty(90), GUSTS)];

    expect(bound(50, goodWindPoorGusts, all)).toBe(40);
    expect(bound(25, [weigh(windy(10), WIND)], all)).toBe(60);
    expect(bound(10, [], all)).toBe(40);
  });
});
