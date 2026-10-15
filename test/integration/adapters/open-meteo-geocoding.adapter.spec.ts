import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { OpenMeteoGeocodingAdapter } from '../../../src/location/geocoding/open-meteo-geocoding.adapter';
import { openMeteoClient, testConfig } from '../../setup/adapter-deps';
import type { EnvOverrides } from '../../setup/test-env';
import { startStubUpstream } from '../../stub-upstream/server';
import type { StubUpstream } from '../../stub-upstream/server';

describe('OpenMeteoGeocodingAdapter against the stub upstream', () => {
  let stub: StubUpstream;

  beforeAll(async () => {
    stub = await startStubUpstream(0);
  });

  afterAll(async () => {
    await stub.close();
  });

  function adapter(behaviour = 'ok', overrides: EnvOverrides = {}): OpenMeteoGeocodingAdapter {
    const config = testConfig({
      UPSTREAM_BASE_URL: `${stub.url}/stub/${behaviour}`,
      ...overrides,
    });
    return new OpenMeteoGeocodingAdapter(openMeteoClient(config));
  }

  it('U-ADAPT-8 Springfield answers ok with five normalised results, Missouri first', async () => {
    const outcome = await adapter().search('Springfield');

    expect(outcome.kind).toBe('ok');
    const results = outcome.kind === 'ok' ? outcome.results : [];
    expect(results).toHaveLength(5);
    expect(results[0]).toEqual({
      id: '4409896',
      name: 'Springfield',
      country: 'United States',
      countryCode: 'US',
      admin1: 'Missouri',
      latitude: 37.21533,
      longitude: -93.29824,
      elevation: 396,
      timezone: 'America/Chicago',
    });
  });

  it('U-ADAPT-8 a result without a country falls back to its country code', async () => {
    const outcome = await adapter().search('Victoria');

    const results = outcome.kind === 'ok' ? outcome.results : [];
    expect(results[2]).toMatchObject({ name: 'Victoria', country: 'HK', countryCode: 'HK' });
  });

  it('U-ADAPT-8 sends the recorded request shape', async () => {
    await adapter().search('Springfield');

    const request = new URL(stub.requests.at(-1) ?? '', stub.url);
    expect(request.pathname).toBe('/stub/ok/v1/search');
    expect(Object.fromEntries(request.searchParams)).toEqual({
      name: 'Springfield',
      count: '5',
      language: 'en',
      format: 'json',
    });
  });

  it('U-ADAPT-8 an unknown name answers ok with no results', async () => {
    const outcome = await adapter().search('Xyzzyqq');

    expect(outcome).toEqual({ kind: 'ok', results: [] });
  });

  it('U-ADAPT-8 a malformed body answers failed with reason malformed, not a throw', async () => {
    const outcome = await adapter('malformed').search('Springfield');

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed' });
  });

  it('U-ADAPT-8 a hung upstream answers reason timeout', async () => {
    const outcome = await adapter('timeout', { UPSTREAM_TIMEOUT_MS: '200' }).search('Springfield');

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'timeout' });
  });

  it('U-ADAPT-8 an HTTP 500 answers reason http', async () => {
    const outcome = await adapter('http500').search('Springfield');

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'http', detail: 'HTTP 500' });
  });

  it('U-ADAPT-9 a refused connection answers reason network', async () => {
    const outcome = await new OpenMeteoGeocodingAdapter(openMeteoClient(testConfig())).search(
      'Springfield',
    );

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'network' });
  });
});
