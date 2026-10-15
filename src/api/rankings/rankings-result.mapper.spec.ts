import { describe, expect, it } from 'vitest';

import { FIXED_NOW } from '../../../test/setup/fixed-clock';
import { locationFacts } from '../../../test/setup/location-facts';
import type { ActivityRanking } from '../../ranking/index';
import { noSignals } from '../../ranking/ranking.util';
import type { EnsureResult } from '../../weather/index';
import { RankingsResultMapper } from './rankings-result.mapper';
import type { LocationRanking } from './rankings.types';

const ENSURED: EnsureResult = {
  dates: [],
  fetchedAt: '2026-10-15T05:00:00.000Z',
  stale: true,
  partial: true,
  sources: [{ source: 'FORECAST', status: 'OK', fetchedAt: '2026-10-15T05:00:00.000Z' }],
  days: {},
};

function ranking(overrides: Partial<ActivityRanking>): ActivityRanking {
  return {
    activity: 'SKIING',
    status: 'APPLICABLE',
    reason: null,
    classifierVersion: '1.1.0',
    days: [],
    ...overrides,
  };
}

function ranked(rankings: readonly ActivityRanking[], ensured = ENSURED): LocationRanking {
  return { location: locationFacts(), ensured, result: { rankings, ruleSetVersion: 'v1' } };
}

const mapper = new RankingsResultMapper();

describe('RankingsResultMapper', () => {
  it('U-API-11 maps location, alternatives and meta, the facts travelling with each location', () => {
    const lyon = locationFacts({ id: '2996944', name: 'Lyon' });

    const result = mapper.toResult(ranked([]), [lyon], FIXED_NOW);

    expect(result.location).toMatchObject({ id: '2988507', region: 'Île-de-France' });
    expect(result.location.facts).toEqual(locationFacts());
    expect(result.meta).toEqual({
      fetchedAt: '2026-10-15T05:00:00.000Z',
      stale: true,
      partial: true,
      sources: ENSURED.sources,
      alternatives: [expect.objectContaining({ id: '2996944', name: 'Lyon', facts: lyon })],
      unranked: [],
    });
  });

  it('U-API-11 each ranked day keeps date, score, factors and signals; internal fields are dropped', () => {
    const signals = noSignals('2026-10-15');
    const day = { date: '2026-10-15', score: 80, factors: [], signals };

    const result = mapper.toResult(ranked([ranking({ days: [day] })]), [], FIXED_NOW);

    expect(result.rankings).toEqual([{ activity: 'SKIING', status: 'APPLICABLE', days: [day] }]);
  });

  it('U-API-11 non-applicable activities with a reason are listed as unranked', () => {
    const rankings = [
      ranking({}),
      ranking({ activity: 'SURFING', status: 'NOT_APPLICABLE', reason: 'no marine data' }),
      ranking({ activity: 'INDOOR_SIGHTSEEING', status: 'UNAVAILABLE', reason: null }),
    ];

    const result = mapper.toResult(ranked(rankings), [], FIXED_NOW);

    expect(result.meta.unranked).toEqual([{ activity: 'SURFING', reason: 'no marine data' }]);
  });

  it('U-API-11 with no source served, fetchedAt falls back to now', () => {
    const result = mapper.toResult(ranked([], { ...ENSURED, fetchedAt: null }), [], FIXED_NOW);

    expect(result.meta.fetchedAt).toBe(FIXED_NOW.toISOString());
  });
});
