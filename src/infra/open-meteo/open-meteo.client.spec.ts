import { afterEach, describe, expect, it, vi } from 'vitest';

import { openMeteoClient, testConfig } from '../../../test/setup/adapter-deps';
import { FIXED_NOW } from '../../../test/setup/fixed-clock';

const POINT = { latitude: 1.5, longitude: -2 };

function answering(response: () => Promise<Response>): string[] {
  const urls: string[] = [];
  vi.stubGlobal('fetch', (url: URL) => {
    urls.push(url.href);
    return response();
  });
  return urls;
}

function named(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe('OpenMeteoClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-ADAPT-1 a body that passes the schema is ok with the parsed data, the raw body and the fetch time', async () => {
    answering(() => Promise.resolve(Response.json({ results: [], extra: true })));

    const outcome = await openMeteoClient().searchLocations('Biarritz');

    expect(outcome).toEqual({
      kind: 'ok',
      data: { results: [] },
      raw: { results: [], extra: true },
      fetchedAt: FIXED_NOW.toISOString(),
    });
  });

  it('U-ADAPT-2 a body that fails the schema is malformed and keeps the raw body', async () => {
    answering(() => Promise.resolve(Response.json({ daily: {} })));

    const outcome = await openMeteoClient().forecast(POINT, 8);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed', raw: { daily: {} } });
  });

  it('U-ADAPT-12 a body that is not JSON is malformed, not a throw', async () => {
    answering(() => Promise.resolve(new Response('<html>busy</html>')));

    const outcome = await openMeteoClient().marine(POINT, 8);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed' });
  });

  it('U-ADAPT-6 a timed-out fetch is reason timeout', async () => {
    answering(() => Promise.reject(named('TimeoutError', 'took too long')));

    const outcome = await openMeteoClient().forecast(POINT, 8);

    expect(outcome).toEqual({ kind: 'failed', reason: 'timeout', detail: 'took too long' });
  });

  it('U-ADAPT-7 a non-2xx status is reason http with the status', async () => {
    answering(() => Promise.resolve(new Response('busy', { status: 503 })));

    const outcome = await openMeteoClient().marine(POINT, 8);

    expect(outcome).toEqual({ kind: 'failed', reason: 'http', detail: 'HTTP 503' });
  });

  it('U-ADAPT-9 a thrown fetch is a failed outcome, not a throw', async () => {
    answering(() => Promise.reject(new TypeError('fetch failed')));

    const outcome = await openMeteoClient().searchLocations('Biarritz');

    expect(outcome).toEqual({ kind: 'failed', reason: 'network', detail: 'fetch failed' });
  });

  it('U-ADAPT-13 UPSTREAM_BASE_URL replaces the host and keeps its path', async () => {
    const urls = answering(() => Promise.resolve(Response.json({})));
    const client = openMeteoClient(testConfig({ UPSTREAM_BASE_URL: 'http://stub:1/stub/ok/' }));

    await client.searchLocations('a,b');

    expect(urls).toEqual([
      'http://stub:1/stub/ok/v1/search?name=a%2Cb&count=5&language=en&format=json',
    ]);
  });

  it('U-ADAPT-15 a region is sent as a qualifier after a comma in the name', async () => {
    const urls = answering(() => Promise.resolve(Response.json({})));
    const client = openMeteoClient(testConfig({ UPSTREAM_BASE_URL: 'http://stub:1' }));

    await client.searchLocations('Springfield', { region: 'Illinois' });

    expect(urls).toEqual([
      'http://stub:1/v1/search?name=Springfield%2C+Illinois&count=5&language=en&format=json',
    ]);
  });

  it('U-ADAPT-16 a country code is sent as countryCode for the provider to filter', async () => {
    const urls = answering(() => Promise.resolve(Response.json({})));
    const client = openMeteoClient(testConfig({ UPSTREAM_BASE_URL: 'http://stub:1' }));

    await client.searchLocations('Springfield', { countryCode: 'US' });

    expect(urls).toEqual([
      'http://stub:1/v1/search?name=Springfield&count=5&language=en&format=json&countryCode=US',
    ]);
  });

  it('U-ADAPT-13 with UPSTREAM_BASE_URL unset each endpoint goes to its real Open-Meteo host', async () => {
    const urls = answering(() => Promise.resolve(Response.json({})));
    const client = openMeteoClient(testConfig({ UPSTREAM_BASE_URL: '' }));

    await client.searchLocations('Biarritz');
    await client.forecast(POINT, 8);
    await client.marine(POINT, 8);

    expect(urls.map((url) => url.split('?')[0])).toEqual([
      'https://geocoding-api.open-meteo.com/v1/search',
      'https://api.open-meteo.com/v1/forecast',
      'https://marine-api.open-meteo.com/v1/marine',
    ]);
  });
});
