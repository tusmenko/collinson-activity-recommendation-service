import { describe, expect, it, vi } from 'vitest';

import { locationFacts } from '../../../test/setup/location-facts';
import type { FactsRepositoryPort, LocationFacts } from '../../location/index';
import { SkiingClassifier } from '../../ranking/classifiers/skiing/skiing.classifier';
import { SurfingClassifier } from '../../ranking/classifiers/surfing/surfing.classifier';
import { ScoreEngine } from '../../ranking/engine/score-engine.service';
import { ClassifierRegistry, UnknownActivityError } from '../../ranking/index';
import type { RankingInput, RankingResult, RankingService } from '../../ranking/index';
import { ForecastUnavailableError } from '../../weather/index';
import type { EnsureResult, IngestService, Source } from '../../weather/index';
import { UpstreamUnavailableError } from '../api.errors';
import { LocationRankingService } from './location-ranking.service';

const RESULT: RankingResult = { rankings: [], ruleSetVersion: 'v1' };

function ensured(overrides: Partial<EnsureResult> = {}): EnsureResult {
  return {
    fetchedAt: '2026-10-15T06:00:00.000Z',
    stale: false,
    partial: false,
    sources: [],
    days: { FORECAST: [] },
    ...overrides,
  };
}

function setup(
  ensure: (location: LocationFacts, sources: readonly Source[]) => Promise<EnsureResult>,
) {
  const registry = new ClassifierRegistry();
  registry.register(new SkiingClassifier(new ScoreEngine()));
  registry.register(new SurfingClassifier(new ScoreEngine()));
  const ingest = { ensure: vi.fn(ensure) };
  const rank = vi.fn<(input: RankingInput) => Promise<RankingResult>>(() =>
    Promise.resolve(RESULT),
  );
  const noteMarineAvailability = vi.fn();
  const setMarineAvailability = vi.fn(() => Promise.resolve());
  const service = new LocationRankingService(
    registry,
    ingest as unknown as IngestService,
    { rank, noteMarineAvailability } as unknown as RankingService,
    { setMarineAvailability } as unknown as FactsRepositoryPort,
  );
  return { service, ingest, rank, noteMarineAvailability, setMarineAvailability };
}

describe('LocationRankingService', () => {
  it('U-API-10 asks the ingest only for the sources the selected classifiers need', async () => {
    const { service, ingest, rank } = setup(() => Promise.resolve(ensured()));
    const paris = locationFacts();

    const ranked = await service.rank(paris, ['SKIING'], 'req-1');

    expect(ingest.ensure).toHaveBeenCalledWith(paris, ['FORECAST']);
    expect(rank).toHaveBeenCalledWith({
      location: paris,
      activities: ['SKIING'],
      days: { FORECAST: [] },
      sources: [],
      fetchedAt: '2026-10-15T06:00:00.000Z',
      requestId: 'req-1',
    });
    expect(ranked).toEqual({ location: paris, ensured: ensured(), result: RESULT });
  });

  it('U-API-10 omitted activities mean every registered one, in SOURCES order', async () => {
    const { service, ingest, rank } = setup(() => Promise.resolve(ensured()));

    await service.rank(locationFacts(), undefined, 'req-1');

    expect(ingest.ensure).toHaveBeenCalledWith(expect.anything(), ['FORECAST', 'MARINE']);
    expect(rank.mock.calls[0]?.[0].activities).toEqual(['SKIING', 'SURFING']);
  });

  it('U-API-10 an unregistered activity is UnknownActivityError before any fetch', async () => {
    const { service, ingest } = setup(() => Promise.resolve(ensured()));

    await expect(service.rank(locationFacts(), ['KITING'], 'req-1')).rejects.toThrow(
      UnknownActivityError,
    );
    expect(ingest.ensure).not.toHaveBeenCalled();
  });

  it('U-API-10 no forecast to serve becomes UPSTREAM_UNAVAILABLE carrying the location', async () => {
    const { service } = setup(() => Promise.reject(new ForecastUnavailableError(45)));
    const paris = locationFacts();

    const failure: unknown = await service
      .rank(paris, ['SKIING'], 'req-1')
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(UpstreamUnavailableError);
    expect(failure).toMatchObject({ location: paris, retryAfterSeconds: 45 });
  });

  it('U-API-10 any other ingest failure propagates unchanged', async () => {
    const boom = new Error('redis down');
    const { service } = setup(() => Promise.reject(boom));

    await expect(service.rank(locationFacts(), ['SKIING'], 'req-1')).rejects.toBe(boom);
  });

  it('U-EVENT-3 a changed marine fact is stored, noted and ranked with', async () => {
    const { service, rank, noteMarineAvailability, setMarineAvailability } = setup(() =>
      Promise.resolve(ensured({ marineAvailability: 'available' })),
    );
    const paris = locationFacts();

    const ranked = await service.rank(paris, ['SURFING'], 'req-1');

    expect(setMarineAvailability).toHaveBeenCalledWith('2988507', 'available');
    expect(noteMarineAvailability).toHaveBeenCalledWith(paris, 'unknown', 'available');
    expect(ranked.location.marineDataAvailable).toBe('available');
    expect(rank.mock.calls[0]?.[0].location.marineDataAvailable).toBe('available');
  });

  it('U-EVENT-3 an unchanged or unserved marine fact is left alone', async () => {
    const same = setup(() => Promise.resolve(ensured({ marineAvailability: 'absent' })));
    const unserved = setup(() => Promise.resolve(ensured()));
    const absent = locationFacts({ marineDataAvailable: 'absent' });

    await same.service.rank(absent, ['SURFING'], 'req-1');
    await unserved.service.rank(absent, ['SKIING'], 'req-1');

    expect(same.setMarineAvailability).not.toHaveBeenCalled();
    expect(unserved.setMarineAvailability).not.toHaveBeenCalled();
    expect(same.noteMarineAvailability).not.toHaveBeenCalled();
  });
});
