import { Injectable } from '@nestjs/common';

import { ClockPort } from '../infra/index';
import { FactsRepositoryPort } from './facts/facts.port';
import { GeocodingPort } from './geocoding/geocoding.port';
import { GEOCODING_RESULT_COUNT } from './location.const';
import { GeocodingUnavailableError, LocationNotFoundError } from './location.errors';
import type { GeocodingResult, LocationFacts, ResolvedLocation } from './location.types';
import { inCountry, normaliseQuery, split } from './location.util';

@Injectable()
export class LocationService {
  constructor(
    private readonly geocoding: GeocodingPort,
    private readonly facts: FactsRepositoryPort,
    private readonly clock: ClockPort,
  ) {}

  async resolve(city: string, country?: string): Promise<ResolvedLocation> {
    const query = normaliseQuery(city, country);
    const cached = await this.fromCache(query);
    if (cached !== null) {
      return cached;
    }
    const outcome = await this.geocoding.search(city.trim());
    if (outcome.kind === 'failed') {
      throw new GeocodingUnavailableError(outcome.reason);
    }
    const candidates =
      country === undefined
        ? outcome.results
        : outcome.results.filter((result) => inCountry(result, country));
    const ordered = candidates.slice(0, GEOCODING_RESULT_COUNT);
    const resolved = split(await this.store(ordered));
    if (resolved === null) {
      throw new LocationNotFoundError(city);
    }
    await this.facts.saveGeocode(
      query,
      [resolved.location, ...resolved.alternatives].map((f) => f.id),
    );
    return resolved;
  }

  // A hit whose facts have gone missing is treated as a miss rather than served partially.
  private async fromCache(query: string): Promise<ResolvedLocation | null> {
    const ids = await this.facts.getGeocode(query);
    if (ids === null) {
      return null;
    }
    const stored = await this.facts.getLocations(ids);
    const present = stored.filter((facts) => facts !== null);
    return present.length === ids.length ? split(present) : null;
  }

  // A known marine availability survives re-geocoding; only new places start as unknown.
  private async store(results: readonly GeocodingResult[]): Promise<LocationFacts[]> {
    const existing = await this.facts.getLocations(results.map((result) => result.id));
    const updatedAt = this.clock.now().toISOString();
    const facts = results.map((result, index): LocationFacts => ({
      ...result,
      marineDataAvailable: existing[index]?.marineDataAvailable ?? 'unknown',
      updatedAt,
    }));
    await Promise.all(facts.map((item) => this.facts.saveLocation(item)));
    return facts;
  }
}
