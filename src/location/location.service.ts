import { Injectable } from '@nestjs/common';

import { ClockPort } from '../infra/index.js';
import { FactsRepositoryPort } from './facts.port.js';
import { GeocodingPort } from './geocoding.port.js';
import { GEOCODING_RESULT_COUNT } from './location.const.js';
import { GeocodingUnavailableError, LocationNotFoundError } from './location.errors.js';
import type { GeocodingResult, LocationFacts, ResolvedLocation } from './location.types.js';

function normaliseQuery(city: string, country: string | undefined): string {
  return `${city.trim().toLowerCase()}|${country?.trim().toLowerCase() ?? ''}`;
}

function inCountry(result: GeocodingResult, country: string): boolean {
  const wanted = country.trim().toLowerCase();
  return result.country.toLowerCase() === wanted || result.countryCode?.toLowerCase() === wanted;
}

// A-10: the first exact-name hit (case-insensitive, accents significant) beats a fuzzy first hit.
function matchFirst(results: readonly GeocodingResult[], city: string): GeocodingResult[] {
  const wanted = city.trim().toLowerCase();
  const exact = results.find((result) => result.name.toLowerCase() === wanted);
  return exact === undefined
    ? [...results]
    : [exact, ...results.filter((result) => result !== exact)];
}

function split(facts: readonly LocationFacts[]): ResolvedLocation | null {
  const [location, ...alternatives] = facts;
  return location === undefined ? null : { location, alternatives };
}

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
    const ordered = matchFirst(candidates, city).slice(0, GEOCODING_RESULT_COUNT);
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
