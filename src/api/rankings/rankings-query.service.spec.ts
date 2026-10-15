import { describe, expect, it, vi } from 'vitest';

import { FIXED_NOW, FixedClock } from '../../../test/setup/fixed-clock';
import { locationFacts } from '../../../test/setup/location-facts';
import type { LocationService } from '../../location/index';
import type { EnsureResult } from '../../weather/index';
import { locationView } from '../api.util';
import type { LocationModel } from '../models/location.model';
import type { LocationRankingService } from './location-ranking.service';
import { RankingsQueryService } from './rankings-query.service';
import { RankingsResultMapper } from './rankings-result.mapper';
import type { LocationRanking } from './rankings.types';

const ENSURED: EnsureResult = {
  fetchedAt: null,
  stale: false,
  partial: false,
  sources: [],
  days: {},
};

function setup() {
  const paris = locationFacts();
  const lyon = locationFacts({ id: '2996944', name: 'Lyon' });
  const resolve = vi.fn(() => Promise.resolve({ location: paris, alternatives: [lyon] }));
  const rank = vi.fn((location: LocationRanking['location']): Promise<LocationRanking> =>
    Promise.resolve({ location, ensured: ENSURED, result: { rankings: [], ruleSetVersion: 'v1' } }),
  );
  const service = new RankingsQueryService(
    { resolve } as unknown as LocationService,
    { rank } as unknown as LocationRankingService,
    new RankingsResultMapper(),
    new FixedClock(),
  );
  return { service, resolve, rank, paris, lyon };
}

describe('RankingsQueryService', () => {
  it('U-API-12 byCity geocodes, ranks the match and lists the alternatives', async () => {
    const { service, resolve, rank, paris } = setup();

    const result = await service.byCity(
      { city: 'Paris', country: 'FR', activities: ['SKIING'] },
      'req-1',
    );

    expect(resolve).toHaveBeenCalledWith('Paris', 'FR');
    expect(rank).toHaveBeenCalledWith(paris, ['SKIING'], 'req-1');
    expect(result.location.id).toBe('2988507');
    expect(result.meta.alternatives.map(({ id }) => id)).toEqual(['2996944']);
    expect(result.meta.fetchedAt).toBe(FIXED_NOW.toISOString());
  });

  it('U-API-12 forLocation ranks the parent location without geocoding and without alternatives', async () => {
    const { service, resolve, rank, lyon } = setup();
    const parent: LocationModel = { ...locationView(lyon), facts: lyon };

    const result = await service.forLocation(parent, undefined, 'req-2');

    expect(resolve).not.toHaveBeenCalled();
    expect(rank).toHaveBeenCalledWith(lyon, undefined, 'req-2');
    expect(result.location.id).toBe('2996944');
    expect(result.meta.alternatives).toEqual([]);
  });
});
