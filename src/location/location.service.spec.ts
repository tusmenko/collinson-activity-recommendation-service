import { describe, expect, it, vi } from 'vitest';

import { FIXED_NOW, FixedClock } from '../../test/setup/fixed-clock';
import { loadFixture } from '../../test/setup/fixtures';
import { GeocodingPayloadSchema } from '../infra/index';
import { FactsRepositoryPort } from './facts/facts.port';
import { toGeocodingResults } from './geocoding/open-meteo-geocoding.util';
import { GeocodingUnavailableError, LocationNotFoundError } from './location.errors';
import { LocationService } from './location.service';
import type {
  GeocodingOutcome,
  GeocodingResult,
  LocationFacts,
  MarineAvailability,
} from './location.types';

function fixtureResults(name: string): GeocodingResult[] {
  const payload = GeocodingPayloadSchema.parse(
    loadFixture(`open-meteo/v1/geocoding/${name.toLowerCase()}.json`),
  );
  return toGeocodingResults(payload);
}

class InMemoryFactsRepository extends FactsRepositoryPort {
  readonly locations = new Map<string, LocationFacts>();
  readonly geocodes = new Map<string, string[]>();

  getLocation(id: string): Promise<LocationFacts | null> {
    return Promise.resolve(this.locations.get(id) ?? null);
  }

  getLocations(ids: readonly string[]): Promise<(LocationFacts | null)[]> {
    return Promise.resolve(ids.map((id) => this.locations.get(id) ?? null));
  }

  saveLocation(facts: LocationFacts): Promise<void> {
    this.locations.set(facts.id, facts);
    return Promise.resolve();
  }

  getGeocode(normalisedQuery: string): Promise<string[] | null> {
    return Promise.resolve(this.geocodes.get(normalisedQuery) ?? null);
  }

  saveGeocode(normalisedQuery: string, ids: readonly string[]): Promise<void> {
    this.geocodes.set(normalisedQuery, [...ids]);
    return Promise.resolve();
  }

  async setMarineAvailability(id: string, value: MarineAvailability): Promise<void> {
    const facts = await this.getLocation(id);
    if (facts !== null) {
      this.locations.set(id, { ...facts, marineDataAvailable: value });
    }
  }
}

function setup(outcome?: GeocodingOutcome) {
  const search = vi.fn((name: string): Promise<GeocodingOutcome> =>
    Promise.resolve(outcome ?? { kind: 'ok', results: fixtureResults(name) }),
  );
  const facts = new InMemoryFactsRepository();
  const service = new LocationService({ search }, facts, new FixedClock());
  return { service, search, facts };
}

describe('LocationService.resolve', () => {
  it('U-LOC-1 resolves London by name, returns the match and writes facts for every result', async () => {
    const { service, facts } = setup();

    const resolved = await service.resolve('London');

    expect(resolved.location).toEqual({
      id: '2643743',
      name: 'London',
      country: 'United Kingdom',
      countryCode: 'GB',
      admin1: 'England',
      latitude: 51.50853,
      longitude: -0.12574,
      elevation: 25,
      timezone: 'Europe/London',
      marineDataAvailable: 'unknown',
      updatedAt: FIXED_NOW.toISOString(),
    });
    expect(facts.locations.get('2643743')).toEqual(resolved.location);
    expect(facts.locations.size).toBe(5);
  });

  it('U-LOC-2 keeps the upstream order: victoria gives Vitória, Brazil with Victoria, Canada next', async () => {
    const { service } = setup();

    const resolved = await service.resolve('victoria');

    expect(resolved.location).toMatchObject({ name: 'Vitória', country: 'Brazil' });
    expect(resolved.alternatives.map((place) => [place.name, place.country])).toEqual([
      ['Victoria', 'Canada'],
      ['Victoria', 'HK'],
      ['Las Tunas', 'Cuba'],
      ['Victoria', 'United States'],
    ]);
  });

  it('U-LOC-3 Springfield gives Missouri and four alternatives in upstream order', async () => {
    const { service } = setup();

    const resolved = await service.resolve('Springfield');

    expect(resolved.location).toMatchObject({ name: 'Springfield', admin1: 'Missouri' });
    expect(resolved.alternatives.map((place) => place.admin1)).toEqual([
      'Illinois',
      'Massachusetts',
      'Ohio',
      'Tennessee',
    ]);
  });

  it('U-LOC-4 Xyzzyqq throws LocationNotFoundError and no forecast fetch follows', async () => {
    const { service, facts } = setup();
    const fetchDays = vi.fn();
    const resolveThenFetch = async (): Promise<void> => {
      const { location } = await service.resolve('Xyzzyqq');
      fetchDays(location);
    };

    const failure: unknown = await resolveThenFetch().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(LocationNotFoundError);
    expect(failure).toMatchObject({
      code: 'NOT_FOUND',
      message: 'No location found for "Xyzzyqq"',
    });
    expect(fetchDays).not.toHaveBeenCalled();
    expect(facts.geocodes.size).toBe(0);
  });

  it('U-LOC-5 a geocode cache hit makes zero adapter calls and returns the same resolution', async () => {
    const { service, search } = setup();
    const first = await service.resolve('Springfield');

    const second = await service.resolve('  springfield ');

    expect(search).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('U-LOC-5 a geocode hit whose facts are gone falls back to the adapter', async () => {
    const { service, search, facts } = setup();
    await service.resolve('Springfield');
    facts.locations.clear();

    const resolved = await service.resolve('Springfield');

    expect(search).toHaveBeenCalledTimes(2);
    expect(resolved.location.admin1).toBe('Missouri');
  });

  it('U-LOC-6 the country filter on london and Canada returns Ontario with no alternatives', async () => {
    const { service, facts } = setup();

    const resolved = await service.resolve('london', 'Canada');

    expect(resolved.location).toMatchObject({ name: 'London', admin1: 'Ontario' });
    expect(resolved.alternatives).toEqual([]);
    expect(facts.geocodes.get('london|canada')).toEqual([resolved.location.id]);
  });

  it('U-LOC-6 the country filter matches the country code case-insensitively', async () => {
    const { service } = setup();

    const resolved = await service.resolve('London', ' ca ');

    expect(resolved.location.admin1).toBe('Ontario');
  });

  it('U-LOC-6 a country filter that removes every result throws LocationNotFoundError', async () => {
    const { service } = setup();

    await expect(service.resolve('London', 'Japan')).rejects.toBeInstanceOf(LocationNotFoundError);
  });

  it('U-LOC-7 a failed geocoding call throws GeocodingUnavailableError with the reason', async () => {
    const { service, facts } = setup({ kind: 'failed', reason: 'timeout', detail: 'aborted' });

    const failure: unknown = await service.resolve('London').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GeocodingUnavailableError);
    expect(failure).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', reason: 'timeout' });
    expect(facts.locations.size).toBe(0);
  });

  it('U-LOC-8 re-geocoding keeps a known marine availability instead of resetting it', async () => {
    const { service, facts } = setup();
    const { location } = await service.resolve('London');
    await facts.setMarineAvailability(location.id, 'absent');
    facts.geocodes.clear();

    const resolved = await service.resolve('London');

    expect(resolved.location.marineDataAvailable).toBe('absent');
  });
});
