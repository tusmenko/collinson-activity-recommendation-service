import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { openMeteoClient, testConfig } from '../../setup/adapter-deps';
import { startStubUpstream } from '../../stub-upstream/server';
import type { StubUpstream } from '../../stub-upstream/server';

const CHAMONIX = { latitude: 45.92375, longitude: 6.86933 };
const BIARRITZ = { latitude: 43.48055, longitude: -1.55684 };
const FETCH_DAYS = 8;

describe('OpenMeteoClient request shapes against the stub upstream', () => {
  let stub: StubUpstream;

  beforeAll(async () => {
    stub = await startStubUpstream(0);
  });

  afterAll(async () => {
    await stub.close();
  });

  function client() {
    return openMeteoClient(testConfig({ UPSTREAM_BASE_URL: `${stub.url}/stub/ok` }));
  }

  // The last request the stub received, as path and parameters.
  function lastRequest(): { pathname: string; params: Record<string, string> } {
    const request = new URL(stub.requests.at(-1) ?? '', stub.url);
    return { pathname: request.pathname, params: Object.fromEntries(request.searchParams) };
  }

  it('U-ADAPT-8 searchLocations sends the recorded request shape', async () => {
    const outcome = await client().searchLocations('Springfield');

    expect(outcome.kind).toBe('ok');
    expect(lastRequest()).toEqual({
      pathname: '/stub/ok/v1/search',
      params: { name: 'Springfield', count: '5', language: 'en', format: 'json' },
    });
  });

  it('U-ADAPT-1 forecast sends the recorded request shape', async () => {
    const outcome = await client().forecast(CHAMONIX, FETCH_DAYS);

    expect(outcome.kind).toBe('ok');
    expect(lastRequest()).toEqual({
      pathname: '/stub/ok/v1/forecast',
      params: {
        latitude: '45.92375',
        longitude: '6.86933',
        daily:
          'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,' +
          'precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,cloud_cover_mean,' +
          'uv_index_max,sunshine_duration,visibility_mean',
        hourly: 'snow_depth',
        forecast_days: '8',
        timezone: 'auto',
      },
    });
  });

  it('U-ADAPT-3 marine sends the recorded request shape', async () => {
    const outcome = await client().marine(BIARRITZ, FETCH_DAYS);

    expect(outcome.kind).toBe('ok');
    expect(lastRequest()).toEqual({
      pathname: '/stub/ok/v1/marine',
      params: {
        latitude: '43.48055',
        longitude: '-1.55684',
        daily: 'wave_height_max,wave_period_max,swell_wave_height_max',
        forecast_days: '8',
        timezone: 'auto',
      },
    });
  });
});
