import { describe, expect, it } from 'vitest';

import { rankingInput } from '../../test/setup/ranking-input';
import type { DaySignals, Source } from '../weather/index';
import type { ClassifierOutput } from './ranking.types';
import { Classifier } from './registry/classifier.port';
import { failedSource, mergeDays, noSignals, unservedDates } from './ranking.util';

class Requiring extends Classifier {
  readonly id = 'REQUIRING';
  readonly version = '1.0.0';
  readonly ruleFile = {};

  constructor(readonly requires: readonly Source[]) {
    super();
  }

  score(): Promise<ClassifierOutput> {
    return Promise.resolve({ status: 'APPLICABLE', days: [] });
  }
}

function day(date: string, signals: Partial<DaySignals> = {}): DaySignals {
  return { ...noSignals(date), ...signals };
}

describe('ranking helpers', () => {
  it('U-RANK-11 noSignals is a dated day with every signal null', () => {
    const { date, ...signals } = noSignals('2026-10-15');

    expect(date).toBe('2026-10-15');
    expect(Object.values(signals).every((value) => value === null)).toBe(true);
  });

  it('U-RANK-11 mergeDays follows the window dates and takes waves from MARINE', () => {
    const merged = mergeDays(
      {
        FORECAST: [day('2026-10-17', { tempMax: 3 }), day('2026-10-15', { tempMax: 1 })],
        MARINE: [day('2026-10-15', { waveHeight: 1.5, wavePeriod: 10, swellHeight: 1.2 })],
      },
      ['2026-10-15'],
    );

    expect(merged).toEqual([
      day('2026-10-15', { tempMax: 1, waveHeight: 1.5, wavePeriod: 10, swellHeight: 1.2 }),
    ]);
  });

  it('U-RANK-11 a forecast day without a marine day keeps null waves', () => {
    const merged = mergeDays({ FORECAST: [day('2026-10-15', { waveHeight: 9 })] }, ['2026-10-15']);

    expect(merged[0]).toMatchObject({ waveHeight: null, wavePeriod: null, swellHeight: null });
  });

  it('U-RANK-11 with no forecast the marine days are the base; with neither every date is null', () => {
    const marine = [day('2026-10-15', { waveHeight: 2 })];

    expect(mergeDays({ FORECAST: [], MARINE: marine }, ['2026-10-15'])).toEqual(marine);
    expect(mergeDays({}, ['2026-10-15'])).toEqual([noSignals('2026-10-15')]);
  });

  it('U-RANK-15 a window date the base source did not serve is all-null and reported unserved', () => {
    const days = { FORECAST: [day('2026-10-15', { tempMax: 1 })] };
    const dates = ['2026-10-15', '2026-10-16'];

    expect(mergeDays(days, dates)).toEqual([
      day('2026-10-15', { tempMax: 1 }),
      noSignals('2026-10-16'),
    ]);
    expect([...unservedDates(days, dates)]).toEqual(['2026-10-16']);
  });

  it('U-RANK-10 a required source that failed with nothing stored is reported', () => {
    const input = rankingInput('london', {
      days: { FORECAST: rankingInput('london').days.FORECAST ?? [] },
      sources: [
        { source: 'FORECAST', status: 'OK', fetchedAt: null },
        { source: 'MARINE', status: 'FAILED', fetchedAt: null },
      ],
    });

    expect(failedSource(new Requiring(['FORECAST', 'MARINE']), input)).toBe('MARINE');
    expect(failedSource(new Requiring(['FORECAST']), input)).toBeUndefined();
  });

  it('U-RANK-10 a failed refetch over stored days, or a skipped source, is not a failure', () => {
    const london = rankingInput('london');
    const staleMarine = rankingInput('london', {
      sources: [
        { source: 'FORECAST', status: 'OK', fetchedAt: null },
        { source: 'MARINE', status: 'FAILED', fetchedAt: null },
      ],
    });
    const skipped = rankingInput('london', {
      days: {},
      sources: [{ source: 'MARINE', status: 'SKIPPED', fetchedAt: null }],
    });

    expect(failedSource(new Requiring(['MARINE']), london)).toBeUndefined();
    expect(failedSource(new Requiring(['MARINE']), staleMarine)).toBeUndefined();
    expect(failedSource(new Requiring(['MARINE']), skipped)).toBeUndefined();
  });
});
