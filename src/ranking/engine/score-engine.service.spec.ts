import { describe, expect, it } from 'vitest';

import type { DaySignals } from '../../weather/index.js';
import type { RuleSet } from '../rules/rule-set.schema.js';
import { ScoreEngine } from './score-engine.service.js';

const EMPTY: DaySignals = {
  date: '2026-10-15',
  tempMax: null,
  tempMin: null,
  precipitation: null,
  precipitationProbability: null,
  snowfall: null,
  snowDepth: null,
  windMax: null,
  windGusts: null,
  cloudCover: null,
  uvIndex: null,
  sunshineHours: null,
  visibility: null,
  weatherCode: null,
  waveHeight: null,
  wavePeriod: null,
  swellHeight: null,
};

const WAVES: RuleSet = {
  version: '1.0.0',
  factors: [
    {
      signal: 'waveHeight',
      unit: 'm',
      weight: 3,
      good: [{ gte: 1, lte: 2.5 }],
      poor: [{ lt: 0.5 }, { gt: 4 }],
      note: 'wave height',
    },
    {
      signal: 'windMax',
      unit: 'km/h',
      weight: 1,
      good: [{ lt: 20 }],
      poor: [{ gt: 30 }],
      note: 'wind',
    },
  ],
};

function day(signals: Partial<DaySignals>): DaySignals {
  return { ...EMPTY, ...signals };
}

const engine = new ScoreEngine();

describe('ScoreEngine.scoreDay', () => {
  it('U-RANK-3 a value inside the good band scores 100 with a positive factor carrying unit and note', () => {
    const scored = engine.scoreDay(day({ waveHeight: 1.5 }), WAVES);

    expect(scored).toEqual({
      date: '2026-10-15',
      score: 100,
      factors: [
        { signal: 'waveHeight', value: 1.5, unit: 'm', effect: 'POSITIVE', note: 'wave height' },
        { signal: 'windMax', value: null, unit: 'km/h', effect: 'NEUTRAL', note: 'wind' },
      ],
    });
  });

  it('U-RANK-3 a value inside the poor band scores 0 with a negative factor', () => {
    const scored = engine.scoreDay(day({ waveHeight: 0.2, windMax: 40 }), WAVES);

    expect(scored.score).toBe(0);
    expect(scored.factors.map((factor) => factor.effect)).toEqual(['NEGATIVE', 'NEGATIVE']);
  });

  it('U-RANK-3 a value between the bands scores 50 with a neutral factor', () => {
    const scored = engine.scoreDay(day({ windMax: 25 }), WAVES);

    expect(scored.score).toBe(50);
    expect(scored.factors[1]?.effect).toBe('NEUTRAL');
  });

  it('U-RANK-3 the day score is the rounded weighted mean over factors with a value', () => {
    const scored = engine.scoreDay(day({ waveHeight: 3, windMax: 10 }), WAVES);

    // (50 * 3 + 100 * 1) / 4 = 62.5
    expect(scored.score).toBe(63);
  });

  it('U-RANK-3 a null value is a neutral factor that carries no weight', () => {
    const scored = engine.scoreDay(day({ windMax: 10 }), WAVES);

    expect(scored.score).toBe(100);
    expect(scored.factors[0]).toMatchObject({ value: null, effect: 'NEUTRAL' });
  });

  it('U-RANK-3 two-sided poor bands score 0 on either side', () => {
    const low = engine.scoreDay(day({ waveHeight: 0.4 }), WAVES);
    const high = engine.scoreDay(day({ waveHeight: 4.5 }), WAVES);

    expect([low.score, high.score]).toEqual([0, 0]);
  });

  it('U-RANK-3 strict and inclusive bounds are kept apart', () => {
    const atGoodEdge = engine.scoreDay(day({ waveHeight: 2.5 }), WAVES);
    const atPoorEdge = engine.scoreDay(day({ waveHeight: 4 }), WAVES);

    expect([atGoodEdge.score, atPoorEdge.score]).toEqual([100, 50]);
  });

  it('U-RANK-3 the floor lifts a low day score', () => {
    const scored = engine.scoreDay(day({ waveHeight: 0.2 }), { ...WAVES, floor: 40 });

    expect(scored.score).toBe(40);
  });

  describe('poor cap', () => {
    const capped: RuleSet = {
      ...WAVES,
      poorCap: { max: 30, minWeight: 2, note: 'deal-breaker' },
      factors: WAVES.factors.map((factor) => ({ ...factor, weight: 2 })),
    };

    it('U-RANK-3 a factor at or above the cap weight inside its poor band caps the day', () => {
      // Uncapped mean: (0 * 2 + 100 * 2) / 4 = 50.
      const scored = engine.scoreDay(day({ waveHeight: 0.2, windMax: 10 }), capped);

      expect(scored.score).toBe(30);
    });

    it('U-RANK-3 a poor factor below the cap weight does not cap the day', () => {
      const rules: RuleSet = { ...WAVES, poorCap: { max: 30, minWeight: 2, note: 'deal-breaker' } };

      // (100 * 3 + 0 * 1) / 4 = 75; the wind factor weighs 1.
      const scored = engine.scoreDay(day({ waveHeight: 1.5, windMax: 40 }), rules);

      expect(scored.score).toBe(75);
    });

    it('U-RANK-3 a capped day keeps a mean that is already lower', () => {
      // (0 * 2 + 50 * 2) / 4 = 25.
      const scored = engine.scoreDay(day({ waveHeight: 0.2, windMax: 25 }), capped);

      expect(scored.score).toBe(25);
    });

    it('U-RANK-3 the cap applies before the floor', () => {
      const scored = engine.scoreDay(day({ waveHeight: 0.2, windMax: 10 }), {
        ...capped,
        floor: 40,
      });

      expect(scored.score).toBe(40);
    });
  });

  it('U-RANK-3 a day with no scorable value has a null score', () => {
    const scored = engine.scoreDay(day({}), { ...WAVES, floor: 40 });

    expect(scored.score).toBeNull();
  });
});

describe('ScoreEngine.gate and unscored', () => {
  const gated: RuleSet = { ...WAVES, gate: { signal: 'snowDepth', min: 5, note: 'snowpack' } };

  it('U-SKI-1 the gate closes when every day is below the minimum or null and reports the maximum', () => {
    const result = engine.gate([day({ snowDepth: 4 }), day({ snowDepth: null })], gated);

    expect(result).toEqual({ open: false, min: 5, max: 4 });
  });

  it('U-SKI-1 the gate reports a null maximum when no day has a value', () => {
    expect(engine.gate([day({})], gated)).toEqual({ open: false, min: 5, max: null });
  });

  it('U-SKI-2 the gate opens when any day reaches the minimum', () => {
    expect(engine.gate([day({ snowDepth: 1 }), day({ snowDepth: 5 })], gated)).toEqual({
      open: true,
    });
  });

  it('U-RANK-3 a rule set without a gate is always open', () => {
    expect(engine.gate([day({})], WAVES)).toEqual({ open: true });
  });

  it('U-RANK-3 unscored days keep their dates with null scores and no factors', () => {
    expect(engine.unscored([day({})])).toEqual([{ date: '2026-10-15', score: null, factors: [] }]);
  });

  it('U-RANK-1 scoreDays scores each day in order', () => {
    const days = [
      day({ date: '2026-10-15', windMax: 10 }),
      day({ date: '2026-10-16', windMax: 40 }),
    ];

    const scored = engine.scoreDays(days, WAVES);

    expect(scored.map(({ date, score }) => [date, score])).toEqual([
      ['2026-10-15', 100],
      ['2026-10-16', 0],
    ]);
  });
});
