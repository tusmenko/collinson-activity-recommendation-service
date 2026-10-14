import { afterAll, describe, expect, it } from 'vitest';

import type { LocationFacts } from '../../../src/location/index.js';
import { RedisFactsRepository } from '../../../src/location/redis-facts.repository.js';
import { testConfig } from '../../setup/adapter-deps.js';
import { createTestRedis, flushTestKeys } from '../../setup/redis.js';

const redis = createTestRedis();
const repository = new RedisFactsRepository(redis, testConfig({ GEOCODE_TTL: '1h' }));

const LONDON: LocationFacts = {
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
  updatedAt: '2026-10-15T06:00:00.000Z',
};

describe('RedisFactsRepository', () => {
  afterAll(async () => {
    await flushTestKeys(redis);
    await redis.quit();
  });

  it('U-LOC-9 saves facts under location:v1 without a TTL and reads them back', async () => {
    await repository.saveLocation(LONDON);

    expect(await repository.getLocation(LONDON.id)).toEqual(LONDON);
    expect(await redis.pttl(`location:v1:${LONDON.id}`)).toBe(-1);
  });

  it('U-LOC-9 reads several locations in one call, null for a missing id', async () => {
    await repository.saveLocation(LONDON);

    expect(await repository.getLocations([LONDON.id, 'missing'])).toEqual([LONDON, null]);
    expect(await repository.getLocations([])).toEqual([]);
  });

  it('U-LOC-9 a missing location reads as null', async () => {
    expect(await repository.getLocation('nowhere')).toBeNull();
  });

  it('U-LOC-9 saves the geocode id list under geocode:v1 with GEOCODE_TTL', async () => {
    await repository.saveGeocode('london|', ['2643743', '6058560']);

    expect(await repository.getGeocode('london|')).toEqual(['2643743', '6058560']);
    const ttl = await redis.pttl('geocode:v1:london|');
    expect(ttl).toBeGreaterThan(3_500_000);
    expect(ttl).toBeLessThanOrEqual(3_600_000);
  });

  it('U-LOC-9 a missing geocode reads as null', async () => {
    expect(await repository.getGeocode('atlantis|')).toBeNull();
  });

  it('U-LOC-9 setMarineAvailability updates the stored fact and ignores an unknown id', async () => {
    await repository.saveLocation(LONDON);

    await repository.setMarineAvailability(LONDON.id, 'absent');
    await repository.setMarineAvailability('nowhere', 'absent');

    expect(await repository.getLocation(LONDON.id)).toMatchObject({
      marineDataAvailable: 'absent',
    });
    expect(await repository.getLocation('nowhere')).toBeNull();
  });
});
