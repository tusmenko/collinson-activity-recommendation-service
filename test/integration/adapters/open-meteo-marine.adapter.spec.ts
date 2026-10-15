import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { OpenMeteoMarineAdapter } from '../../../src/weather/sources/marine/open-meteo-marine.adapter';
import { openMeteoClient, testConfig } from '../../setup/adapter-deps';
import type { EnvOverrides } from '../../setup/test-env';
import { startStubUpstream } from '../../stub-upstream/server';
import type { StubUpstream } from '../../stub-upstream/server';

const LONDON = { latitude: 51.50853, longitude: -0.12574 };
const BIARRITZ = { latitude: 43.48055, longitude: -1.55684 };
const FETCH_DAYS = 8;

describe('OpenMeteoMarineAdapter against the stub upstream', () => {
  let stub: StubUpstream;

  beforeAll(async () => {
    stub = await startStubUpstream(0);
  });

  afterAll(async () => {
    await stub.close();
  });

  function adapter(behaviour = 'ok', overrides: EnvOverrides = {}): OpenMeteoMarineAdapter {
    const config = testConfig({
      UPSTREAM_BASE_URL: `${stub.url}/stub/${behaviour}`,
      ...overrides,
    });
    return new OpenMeteoMarineAdapter(openMeteoClient(config));
  }

  it('U-ADAPT-3 London marine nulls normalise to all-null wave fields with kind ok', async () => {
    const outcome = await adapter().fetchDays(LONDON, FETCH_DAYS);

    expect(outcome).toMatchObject({ kind: 'ok', providerSchemaVersion: 'v1' });
    const days = outcome.kind === 'ok' ? outcome.days : [];
    expect(days).toHaveLength(FETCH_DAYS);
    expect(
      days.every(
        (day) => day.waveHeight === null && day.wavePeriod === null && day.swellHeight === null,
      ),
    ).toBe(true);
  });

  it('U-ADAPT-3 Biarritz marine normalises wave height, period and swell; weather fields stay null', async () => {
    const outcome = await adapter().fetchDays(BIARRITZ, FETCH_DAYS);

    const days = outcome.kind === 'ok' ? outcome.days : [];
    expect(days.map((day) => day.waveHeight)).toEqual([1.68, 1.98, 2, 1.72, 1.2, 1.28, 1.28, 1.84]);
    expect(days[0]).toEqual({
      date: '2026-10-15',
      tempMax: null,
      tempMin: null,
      precipitation: null,
      precipitationProbability: null,
      snowfall: null,
      snowDepth: null,
      windMax: null,
      windGusts: null,
      cloudCover: null,
      uvIndex: null,
      sunshineHours: null,
      visibility: null,
      weatherCode: null,
      waveHeight: 1.68,
      wavePeriod: 12.35,
      swellHeight: 1.46,
    });
  });

  it('U-ADAPT-2 a marine payload missing wave_height_max is a failed source with the raw body', async () => {
    const outcome = await adapter('malformed').fetchDays(BIARRITZ, FETCH_DAYS);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed' });
    expect(outcome).toHaveProperty('raw.daily.wave_period_max');
  });

  it('U-ADAPT-6 a hung marine upstream yields reason timeout within one second', async () => {
    const started = performance.now();

    const outcome = await adapter('timeout', { UPSTREAM_TIMEOUT_MS: '200' }).fetchDays(
      BIARRITZ,
      FETCH_DAYS,
    );

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'timeout' });
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('U-ADAPT-7 a marine HTTP 500 yields reason http', async () => {
    const outcome = await adapter('http500').fetchDays(BIARRITZ, FETCH_DAYS);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'http' });
  });

  it('U-ADAPT-9 a refused marine connection yields reason network', async () => {
    const unreachable = new OpenMeteoMarineAdapter(openMeteoClient(testConfig()));

    const outcome = await unreachable.fetchDays(BIARRITZ, FETCH_DAYS);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'network' });
  });
});
