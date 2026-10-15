import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import { ConfigService } from '../../infra/index.js';
import type { LocationFacts, MarineAvailability } from '../location.types.js';
import { FactsRepositoryPort } from './facts.port.js';
import { geocodeKey, locationKey, parseFacts } from './facts.util.js';

@Injectable()
export class RedisFactsRepository extends FactsRepositoryPort {
  constructor(
    private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async getLocation(id: string): Promise<LocationFacts | null> {
    return parseFacts(await this.redis.get(locationKey(id)));
  }

  async getLocations(ids: readonly string[]): Promise<(LocationFacts | null)[]> {
    if (ids.length === 0) {
      return [];
    }
    const values = await this.redis.mget(ids.map(locationKey));
    return values.map(parseFacts);
  }

  async saveLocation(facts: LocationFacts): Promise<void> {
    await this.redis.set(locationKey(facts.id), JSON.stringify(facts));
  }

  async getGeocode(normalisedQuery: string): Promise<string[] | null> {
    const value = await this.redis.get(geocodeKey(normalisedQuery));
    return value === null ? null : (JSON.parse(value) as string[]);
  }

  async saveGeocode(normalisedQuery: string, ids: readonly string[]): Promise<void> {
    await this.redis.set(
      geocodeKey(normalisedQuery),
      JSON.stringify(ids),
      'PX',
      this.config.get('GEOCODE_TTL'),
    );
  }

  async setMarineAvailability(id: string, value: MarineAvailability): Promise<void> {
    const facts = await this.getLocation(id);
    if (facts !== null) {
      await this.saveLocation({ ...facts, marineDataAvailable: value });
    }
  }
}
