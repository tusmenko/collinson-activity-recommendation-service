import { afterEach, describe, expect, it, vi } from 'vitest';

import { openMeteoClient } from '../../../../test/setup/adapter-deps';
import { loadFixture } from '../../../../test/setup/fixtures';
import { OpenMeteoForecastAdapter } from './open-meteo-forecast.adapter';

const CHAMONIX = { latitude: 45.92375, longitude: 6.86933 };

// Unit level: fetch is replaced, so no socket opens; the stub-upstream specs cover the wire.
function adapterAnswering(body: string): OpenMeteoForecastAdapter {
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(body, { status: 200 })));
  return new OpenMeteoForecastAdapter(openMeteoClient());
}

describe('OpenMeteoForecastAdapter normalisation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-ADAPT-11 the archive day keeps provider nulls as null and reduces snow depth to cm', async () => {
    const archive = JSON.stringify(loadFixture('open-meteo/v1/archive/chamonix-2026-01-10.json'));

    const outcome = await adapterAnswering(archive).fetchDays(CHAMONIX, 8);

    const days = outcome.kind === 'ok' ? outcome.days : [];
    expect(days[0]).toMatchObject({
      date: '2026-01-10',
      tempMax: -2,
      snowfall: 12.53,
      snowDepth: 77,
      sunshineHours: 0,
      precipitationProbability: null,
      uvIndex: null,
      visibility: null,
    });
  });

  it('U-ADAPT-12 a body that is not JSON is a malformed source, not a throw', async () => {
    const outcome = await adapterAnswering('<html>busy</html>').fetchDays(CHAMONIX, 8);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed' });
  });
});
