import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { FixedClock } from '../setup/fixed-clock';
import { startStubUpstream } from '../stub-upstream/server';
import type { StubUpstream } from '../stub-upstream/server';
import { createTestApp } from './setup/create-test-app';
import type { TestApp } from './setup/create-test-app';
import { loadQuery, postGraphql } from './setup/graphql-client';

// The recorded forecasts start on 2026-10-15; noon UTC puts Biarritz's local day there too.
const RECORDED_NOW = new Date('2026-10-15T12:00:00.000Z');

const REGION_QUERY = `query ($city: String!, $region: String) {
  activityRankings(city: $city, region: $region, activities: [INDOOR_SIGHTSEEING]) {
    location { name region country }
    rankings { activity status }
  }
}`;

interface Place {
  readonly name: string;
  readonly country: string;
}

interface AlternativesData {
  readonly activityRankings: {
    readonly location: Place;
    readonly rankings: readonly { readonly activity: string }[];
    readonly meta: { readonly alternatives: readonly (Place & { readonly rankings: unknown })[] };
  };
}

describe('E-API-15 and E-API-17 ambiguous names and their alternatives', () => {
  let stub: StubUpstream;
  let testApp: TestApp;

  beforeAll(async () => {
    stub = await startStubUpstream();
    testApp = await createTestApp(
      { UPSTREAM_BASE_URL: stub.url },
      { clock: new FixedClock(RECORDED_NOW) },
    );
  });

  afterEach(() => {
    stub.setBehaviour('/v1/forecast', 'ok');
  });

  afterAll(async () => {
    await testApp.close();
    await stub.close();
  });

  it('E-API-15 a failure ranking one alternative nulls only its rankings and reports one error with the path', async () => {
    const variables = { city: 'Biarritz', country: 'FR' };
    // The place's windows are stored first; its one French alternative (the airport) has never been fetched,
    // so with the forecast route failing only the alternative's ranking fails.
    await postGraphql(testApp.url, loadQuery('default.graphql'), variables);
    stub.setBehaviour('/v1/forecast', 'http500');

    const response = await postGraphql<AlternativesData>(
      testApp.url,
      loadQuery('alternatives.graphql'),
      variables,
    );

    const result = response.data?.activityRankings;
    expect(result?.location).toMatchObject({ name: 'Biarritz', country: 'France' });
    expect(result?.rankings).toHaveLength(4);
    expect(result?.meta.alternatives).toEqual([
      expect.objectContaining({ name: 'Biarritz Pays Basque Airport', rankings: null }),
    ]);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0]).toMatchObject({
      path: ['activityRankings', 'meta', 'alternatives', 0, 'rankings'],
      extensions: { code: 'UPSTREAM_UNAVAILABLE' },
    });
  });

  it('E-API-17 a region narrows an ambiguous name: Springfield, Illinois resolves Illinois first', async () => {
    const before = stub.requests.length;

    const response = await postGraphql<{
      activityRankings: { location: Place & { region: string } };
    }>(testApp.url, REGION_QUERY, { city: 'Springfield', region: 'Illinois' });

    expect(response.errors).toEqual([]);
    expect(response.data?.activityRankings.location).toMatchObject({
      name: 'Springfield',
      region: 'Illinois',
      country: 'United States',
    });
    expect(stub.requests.slice(before).filter((call) => call.startsWith('/v1/search'))).toEqual([
      '/v1/search?name=Springfield%2C+Illinois&count=5&language=en&format=json',
    ]);
  });
});
