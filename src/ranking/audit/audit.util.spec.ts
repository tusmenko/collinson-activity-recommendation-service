import { describe, expect, it } from 'vitest';

import type { ActivityRanking, RankedDay } from '../ranking.types';
import { noSignals } from '../ranking.util';
import { violations } from './audit.util';

function rankedDay(date: string, score: number | null): RankedDay {
  return { date, score, factors: [], signals: noSignals(date) };
}

function ranking(status: ActivityRanking['status'], days: readonly RankedDay[]): ActivityRanking {
  return { activity: 'SKIING', status, reason: null, classifierVersion: '1.0.0', days };
}

const WINDOW = [rankedDay('2026-10-15', 40), rankedDay('2026-10-16', 60)];

describe('ranking invariants', () => {
  it('U-EVENT-2 a complete applicable window in date order has no violation', () => {
    expect(violations(ranking('APPLICABLE', WINDOW), 2)).toEqual([]);
  });

  it('U-EVENT-2 a score outside 0 to 100 is score_out_of_range', () => {
    const days = [rankedDay('2026-10-15', -1), rankedDay('2026-10-16', 101)];

    expect(violations(ranking('APPLICABLE', days), 2)).toEqual(['score_out_of_range']);
  });

  it('U-EVENT-2 a wrong day count or dates out of order is window_mismatch', () => {
    expect(violations(ranking('APPLICABLE', WINDOW), 3)).toEqual(['window_mismatch']);
    expect(violations(ranking('APPLICABLE', [...WINDOW].reverse()), 2)).toEqual([
      'window_mismatch',
    ]);
  });

  it('U-EVENT-2 an applicable day without a score is missing_score', () => {
    const days = [rankedDay('2026-10-15', 40), rankedDay('2026-10-16', null)];

    expect(violations(ranking('APPLICABLE', days), 2)).toEqual(['missing_score']);
  });

  it('U-EVENT-2 a scored day under a non-applicable status is score_without_applicability', () => {
    expect(violations(ranking('NOT_APPLICABLE', WINDOW), 2)).toEqual([
      'score_without_applicability',
    ]);
  });

  it('U-EVENT-2 a non-applicable ranking is not checked for its window, only for scores', () => {
    const days = [rankedDay('2026-10-15', null)];

    expect(violations(ranking('UNAVAILABLE', days), 7)).toEqual([]);
    expect(violations(ranking('UNAVAILABLE', [rankedDay('2026-10-15', 150)]), 7)).toEqual([
      'score_out_of_range',
      'score_without_applicability',
    ]);
  });
});
