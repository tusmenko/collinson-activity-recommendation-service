import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { SourceFetchOutcome } from '../../../src/weather/index.js';
import { OpenMeteoForecastAdapter } from '../../../src/weather/open-meteo-forecast.adapter.js';
import { silentLogger, testConfig } from '../../setup/adapter-deps.js';
import { FIXED_NOW, FixedClock } from '../../setup/fixed-clock.js';
import type { EnvOverrides } from '../../setup/test-env.js';
import { startStubUpstream } from '../../stub-upstream/server.js';
import type { StubUpstream } from '../../stub-upstream/server.js';

const CHAMONIX = { latitude: 45.92375, longitude: 6.86933 };
const HINTERTUX = { latitude: 47.11667, longitude: 11.68333 };
const FETCH_DAYS = 8;

describe('OpenMeteoForecastAdapter against the stub upstream', () => {
  let stub: StubUpstream;

  beforeAll(async () => {
    stub = await startStubUpstream(0);
  });

  afterAll(async () => {
    await stub.close();
  });

  function adapter(behaviour = 'ok', overrides: EnvOverrides = {}): OpenMeteoForecastAdapter {
    const config = testConfig({
      UPSTREAM_FORECAST_URL: `${stub.url}/stub/${behaviour}`,
      ...overrides,
    });
    return new OpenMeteoForecastAdapter(config, silentLogger(), new FixedClock());
  }

  function okDays(outcome: SourceFetchOutcome) {
    if (outcome.kind !== 'ok') {
      throw new Error(`expected ok, got ${outcome.reason}: ${outcome.detail}`);
    }
    return outcome.days;
  }

  it('U-ADAPT-1 validates and normalises eight Chamonix days', async () => {
    const outcome = await adapter().fetchDays(CHAMONIX, FETCH_DAYS);

    expect(outcome).toMatchObject({
      kind: 'ok',
      providerSchemaVersion: 'v1',
      fetchedAt: FIXED_NOW.toISOString(),
    });
    const days = okDays(outcome);
    expect(days.map((day) => day.date)).toEqual([
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ]);
    expect(days.map((day) => day.tempMax)).toEqual([20.8, 19.5, 16.9, 11.4, 20, 17.1, 19.2, 11.7]);
    expect(days.every((day) => day.snowfall === 0)).toBe(true);
    expect(days[0]).toMatchObject({ sunshineHours: 10.5, visibility: 41761.67, snowDepth: 0 });
    expect(days[0]).toMatchObject({ waveHeight: null, wavePeriod: null, swellHeight: null });
  });

  it('U-ADAPT-1 sends the recorded request shape', async () => {
    await adapter().fetchDays(CHAMONIX, FETCH_DAYS);

    const request = new URL(stub.requests.at(-1) ?? '', stub.url);
    expect(request.pathname).toBe('/stub/ok/v1/forecast');
    expect(Object.fromEntries(request.searchParams)).toEqual({
      latitude: '45.92375',
      longitude: '6.86933',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,' +
        'precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,cloud_cover_mean,' +
        'uv_index_max,sunshine_duration,visibility_mean',
      hourly: 'snow_depth',
      forecast_days: '8',
      timezone: 'auto',
    });
  });

  it('U-ADAPT-2 a payload missing a daily field is a failed source with the raw body, not a throw', async () => {
    const outcome = await adapter('malformed').fetchDays(CHAMONIX, FETCH_DAYS);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed' });
    expect(outcome).toHaveProperty('raw.daily.time');
    expect(outcome).not.toHaveProperty('raw.daily.temperature_2m_max');
  });

  it('U-ADAPT-4 Hintertux snow depth reduces to a 39 cm daily maximum and zero stays zero', async () => {
    const days = okDays(await adapter().fetchDays(HINTERTUX, FETCH_DAYS));

    expect(days.map((day) => day.snowDepth)).toEqual([39, 38, 0, 0, 0, 0, 0, 0]);
  });

  it('U-ADAPT-6 a hung upstream yields reason timeout within one second', async () => {
    const started = performance.now();

    const outcome = await adapter('timeout', { UPSTREAM_TIMEOUT_MS: '200' }).fetchDays(
      CHAMONIX,
      FETCH_DAYS,
    );

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'timeout' });
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('U-ADAPT-7 an HTTP 500 yields reason http', async () => {
    const outcome = await adapter('http500').fetchDays(CHAMONIX, FETCH_DAYS);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'http', detail: 'HTTP 500' });
  });

  it('U-ADAPT-7 coordinates with no fixture nearby yield reason http from the 404', async () => {
    const outcome = await adapter().fetchDays({ latitude: 0, longitude: 0 }, FETCH_DAYS);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'http', detail: 'HTTP 404' });
  });

  it('U-ADAPT-9 a refused connection yields reason network', async () => {
    const config = testConfig();
    const unreachable = new OpenMeteoForecastAdapter(config, silentLogger(), new FixedClock());

    const outcome = await unreachable.fetchDays(CHAMONIX, FETCH_DAYS);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'network' });
  });
});
