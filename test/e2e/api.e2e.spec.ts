import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { FixedClock } from '../setup/fixed-clock.js';
import { startStubUpstream } from '../stub-upstream/server.js';
import type { StubUpstream } from '../stub-upstream/server.js';
import { createTestApp } from './setup/create-test-app.js';
import type { TestApp } from './setup/create-test-app.js';
import { loadQuery, postGraphql } from './setup/graphql-client.js';
import type { GraphqlResponse } from './setup/graphql-client.js';

// The recorded forecasts start on 2026-10-15; noon UTC puts every golden city's local day there too.
const RECORDED_NOW = new Date('2026-10-15T12:00:00.000Z');
const DEFAULT_QUERY = loadQuery('default.graphql');
const DETAILS_QUERY = loadQuery('details.graphql');
const ACTIVITIES = ['SKIING', 'SURFING', 'OUTDOOR_SIGHTSEEING', 'INDOOR_SIGHTSEEING'];

interface Day {
  readonly date: string;
  readonly score: number | null;
  readonly details?: {
    readonly factors: readonly { readonly signal: string; readonly effect: string }[];
    readonly signals: { readonly date: string };
  };
}

interface Ranking {
  readonly activity: string;
  readonly status: string;
  readonly days: readonly Day[];
}

interface Place {
  readonly name: string;
  readonly region: string | null;
  readonly country: string;
}

interface RankingsData {
  readonly activityRankings: {
    readonly location: Place;
    readonly rankings: readonly Ranking[];
    readonly meta: {
      readonly fetchedAt: string;
      readonly stale: boolean;
      readonly partial: boolean;
      readonly sources: readonly { readonly source: string; readonly status: string }[];
      readonly alternatives?: readonly Place[];
      readonly reasons?: readonly { readonly activity: string; readonly reason: string }[];
    };
  };
}

function upstream(url: string): Record<string, string> {
  return { UPSTREAM_BASE_URL: url };
}

function rankingOf(response: GraphqlResponse<RankingsData>, activity: string): Ranking | undefined {
  return response.data?.activityRankings.rankings.find((ranking) => ranking.activity === activity);
}

function codeOf(response: GraphqlResponse<unknown>): unknown {
  return response.errors[0]?.extensions?.code;
}

describe('E-API api end to end over HTTP', () => {
  let stub: StubUpstream;
  let testApp: TestApp;

  const query = (
    text: string,
    variables: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<GraphqlResponse<RankingsData>> =>
    postGraphql<RankingsData>(testApp.url, text, variables, headers);

  // The result of `act` and the requests the stub received while it ran.
  const withCalls = async <Result>(
    act: () => Promise<Result>,
  ): Promise<{ result: Result; calls: string[] }> => {
    const before = stub.requests.length;
    const result = await act();
    return { result, calls: stub.requests.slice(before) };
  };

  beforeAll(async () => {
    stub = await startStubUpstream();
    testApp = await createTestApp(upstream(stub.url), { clock: new FixedClock(RECORDED_NOW) });
  });

  afterEach(() => {
    stub.setBehaviour('/v1/search', 'ok');
    stub.setBehaviour('/v1/forecast', 'ok');
    stub.setBehaviour('/v1/marine', 'ok');
  });

  afterAll(async () => {
    await testApp.close();
    await stub.close();
  });

  it('E-API-8 a cold query makes at most three upstream calls: geocoding, forecast, marine', async () => {
    const { calls } = await withCalls(() => query(DEFAULT_QUERY, { city: 'Biarritz' }));

    expect(calls.length).toBeLessThanOrEqual(3);
    expect(calls.map((call) => call.split('?')[0]).sort()).toEqual([
      '/v1/forecast',
      '/v1/marine',
      '/v1/search',
    ]);
  });

  it('E-API-7 a second identical query is served warm with zero upstream calls', async () => {
    const { calls } = await withCalls(() => query(DEFAULT_QUERY, { city: 'Biarritz' }));

    expect(calls).toEqual([]);
  });

  it('E-API-1 Biarritz returns the location and four rankings of seven days in date order', async () => {
    const response = await query(DEFAULT_QUERY, { city: 'Biarritz' });

    expect(response.errors).toEqual([]);
    const result = response.data?.activityRankings;
    expect(result?.location).toMatchObject({ name: 'Biarritz', country: 'France' });
    expect(result?.rankings.map((ranking) => ranking.activity)).toEqual(ACTIVITIES);
    for (const ranking of result?.rankings ?? []) {
      const dates = ranking.days.map((day) => day.date);
      expect(dates).toHaveLength(7);
      expect(dates).toEqual([...dates].sort());
    }
    expect(result?.meta.stale).toBe(false);
  });

  it('E-API-1 the request id is taken from x-request-id and echoed on the response', async () => {
    const response = await query(DEFAULT_QUERY, { city: 'Biarritz' }, { 'x-request-id': 'req-42' });

    expect(response.headers.get('x-request-id')).toBe('req-42');
  });

  it('E-API-4 the default query body has no details key', async () => {
    const response = await query(DEFAULT_QUERY, { city: 'Biarritz' });

    expect(response.data).not.toBeNull();
    expect(response.text).not.toContain('"details"');
    expect(response.text).not.toContain('"factors"');
  });

  it('E-API-5 a details query returns factors and signals per day', async () => {
    const response = await query(DETAILS_QUERY, { city: 'Biarritz' });

    const outdoor = rankingOf(response, 'OUTDOOR_SIGHTSEEING');
    expect(outdoor?.status).toBe('APPLICABLE');
    for (const day of outdoor?.days ?? []) {
      expect(day.details?.factors.length).toBeGreaterThan(0);
      expect(day.details?.signals.date).toBe(day.date);
    }
  });

  it('E-API-6 meta carries fetchedAt as a timestamp and the stale flag', async () => {
    const response = await query(DEFAULT_QUERY, { city: 'Biarritz' });

    const meta = response.data?.activityRankings.meta;
    expect(Number.isNaN(Date.parse(meta?.fetchedAt ?? ''))).toBe(false);
    expect(meta?.stale).toBe(false);
  });

  it('E-API-2 Springfield resolves to Missouri with four alternatives in meta', async () => {
    const response = await query(DEFAULT_QUERY, { city: 'Springfield' });

    const result = response.data?.activityRankings;
    expect(result?.location).toMatchObject({ name: 'Springfield', region: 'Missouri' });
    expect(result?.meta.alternatives).toHaveLength(4);
  });

  it('E-API-3 an unknown name gives NOT_FOUND naming the input and no forecast call', async () => {
    const { result: response, calls } = await withCalls(() =>
      query(DEFAULT_QUERY, { city: 'Xyzzyqq' }),
    );

    expect(response.data).toBeNull();
    expect(response.errors[0]?.extensions).toMatchObject({ code: 'NOT_FOUND', input: 'Xyzzyqq' });
    expect(response.errors[0]?.message).toContain('Xyzzyqq');
    expect(calls.filter((call) => !call.startsWith('/v1/search'))).toEqual([]);
  });

  it('E-API-3 a malformed city gives BAD_USER_INPUT and reaches no upstream', async () => {
    const { result: response, calls } = await withCalls(() =>
      query(DEFAULT_QUERY, { city: 'Lond0n;drop' }),
    );

    expect(codeOf(response)).toBe('BAD_USER_INPUT');
    expect(calls).toEqual([]);
  });

  it('E-API-11 a marine failure on a coastal city gives surfing UNAVAILABLE and partial meta', async () => {
    stub.setBehaviour('/v1/marine', 'http500');

    const response = await query(DEFAULT_QUERY, { city: 'Dubai' });

    expect(response.errors).toEqual([]);
    expect(rankingOf(response, 'SURFING')?.status).toBe('UNAVAILABLE');
    expect(rankingOf(response, 'OUTDOOR_SIGHTSEEING')?.status).toBe('APPLICABLE');
    const meta = response.data?.activityRankings.meta;
    expect(meta?.partial).toBe(true);
    expect(meta?.sources).toContainEqual({ source: 'MARINE', status: 'FAILED', fetchedAt: null });
  });

  it('E-API-12 a forecast failure with an empty store gives UPSTREAM_UNAVAILABLE', async () => {
    stub.setBehaviour('/v1/forecast', 'http500');

    const response = await query(DEFAULT_QUERY, { city: 'Chamonix' });

    expect(response.data).toBeNull();
    const extensions = response.errors[0]?.extensions;
    expect(extensions).toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      retryAfterSeconds: expect.any(Number) as number,
      location: { name: 'Chamonix', country: 'France' },
    });
  });

  it('E-API-12 a geocoding failure gives UPSTREAM_UNAVAILABLE with retryAfterSeconds', async () => {
    stub.setBehaviour('/v1/search', 'http500');

    const response = await query(DEFAULT_QUERY, { city: 'Hintertux' });

    expect(response.data).toBeNull();
    expect(response.errors[0]?.extensions).toEqual({
      code: 'UPSTREAM_UNAVAILABLE',
      retryAfterSeconds: expect.any(Number) as number,
    });
  });

  it('E-API-13 London gives surfing NOT_APPLICABLE with a reason in meta.reasons', async () => {
    const response = await query(DETAILS_QUERY, { city: 'London' });

    const surfing = rankingOf(response, 'SURFING');
    expect(surfing?.status).toBe('NOT_APPLICABLE');
    expect(surfing?.days.every((day) => day.score === null)).toBe(true);
    expect(response.data?.activityRankings.meta.reasons).toContainEqual({
      activity: 'SURFING',
      reason: expect.any(String) as string,
    });
  });

  it('E-API-13 an activities filter ranks only the requested activities', async () => {
    const response = await query(DETAILS_QUERY, { city: 'London', activities: ['SKIING'] });

    expect(response.data?.activityRankings.rankings.map((ranking) => ranking.activity)).toEqual([
      'SKIING',
    ]);
  });

  it('E-API-9 six rankings selections in one query give QUERY_TOO_COMPLEX before any upstream call', async () => {
    const nested = `query {
      activityRankings(city: "Biarritz") { location { rankings { location { rankings {
        location { rankings { location { rankings { location { rankings { meta { stale } }
      } } } } } } } } } }
    }`;
    const { result: response, calls } = await withCalls(() => postGraphql(testApp.url, nested));

    expect(codeOf(response)).toBe('QUERY_TOO_COMPLEX');
    expect(calls).toEqual([]);
  });

  it('E-API-9 five rankings selections are within the limit', async () => {
    const aliases = [1, 2, 3, 4, 5]
      .map((index) => `a${String(index)}: activityRankings(city: "Biarritz") { meta { stale } }`)
      .join('\n');

    const response = await postGraphql(testApp.url, `query { ${aliases} }`);

    expect(response.errors).toEqual([]);
  });

  it('E-API-2 Location.rankings ranks a stored location without geocoding again', async () => {
    const linked = `query {
      activityRankings(city: "Biarritz", activities: [SURFING]) {
        location { rankings(activities: [SKIING]) { rankings { activity status } } }
      }
    }`;
    const { result: response, calls } = await withCalls(() =>
      postGraphql<{ activityRankings: { location: { rankings: { rankings: Ranking[] } } } }>(
        testApp.url,
        linked,
      ),
    );

    expect(response.data?.activityRankings.location.rankings.rankings).toEqual([
      { activity: 'SKIING', status: 'NOT_APPLICABLE' },
    ]);
    expect(calls).toEqual([]);
  });
});

describe('E-API-10 inbound throttle', () => {
  let stub: StubUpstream;
  let testApp: TestApp;

  beforeAll(async () => {
    stub = await startStubUpstream();
    testApp = await createTestApp(
      { ...upstream(stub.url), INBOUND_PER_MINUTE: '3' },
      { clock: new FixedClock(RECORDED_NOW) },
    );
  });

  afterAll(async () => {
    await testApp.close();
    await stub.close();
  });

  it('E-API-10 the fourth request within a minute gives RATE_LIMITED', async () => {
    const codes: unknown[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      codes.push(codeOf(await postGraphql(testApp.url, DEFAULT_QUERY, { city: 'Xyzzyqq' })));
    }

    expect(codes).toEqual(['NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND', 'RATE_LIMITED']);
  });

  it('E-API-10 the health endpoint is not throttled', async () => {
    const response = await fetch(`${testApp.url}/health`);

    expect(response.status).toBe(200);
  });
});
