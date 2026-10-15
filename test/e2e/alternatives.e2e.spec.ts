import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FixedClock } from '../setup/fixed-clock';
import { startStubUpstream } from '../stub-upstream/server';
import type { StubUpstream } from '../stub-upstream/server';
import { createTestApp } from './setup/create-test-app';
import type { TestApp } from './setup/create-test-app';
import { loadQuery, postGraphql } from './setup/graphql-client';

// The recorded forecasts start on 2026-10-15; noon UTC puts Biarritz's local day there too.
const RECORDED_NOW = new Date('2026-10-15T12:00:00.000Z');

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

describe('E-API-15 partial results across alternatives', () => {
  let stub: StubUpstream;
  let testApp: TestApp;

  beforeAll(async () => {
    stub = await startStubUpstream();
    testApp = await createTestApp(
      { UPSTREAM_BASE_URL: stub.url },
      { clock: new FixedClock(RECORDED_NOW) },
    );
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
});
