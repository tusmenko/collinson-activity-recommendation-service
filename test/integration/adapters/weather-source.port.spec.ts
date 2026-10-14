import { describe, expect, it } from 'vitest';

import { WeatherSourcePort } from '../../../src/weather/index.js';
import type { Coordinates, Source, SourceFetchOutcome } from '../../../src/weather/index.js';

// A second provider: it touches only its own file and is accepted wherever the port is.
class ConstantWeatherAdapter extends WeatherSourcePort {
  readonly source: Source = 'FORECAST';

  fetchDays(_coordinates: Coordinates, days: number): Promise<SourceFetchOutcome> {
    return Promise.resolve({
      kind: 'ok',
      days: Array.from({ length: days }, () => ({
        date: '2026-10-15',
        tempMax: 20,
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
        waveHeight: null,
        wavePeriod: null,
        swellHeight: null,
      })),
      raw: {},
      providerSchemaVersion: 'constant-1',
      fetchedAt: '2026-10-15T06:00:00.000Z',
    });
  }
}

async function countDays(port: WeatherSourcePort): Promise<number> {
  const outcome = await port.fetchDays({ latitude: 0, longitude: 0 }, 3);
  return outcome.kind === 'ok' ? outcome.days.length : 0;
}

describe('WeatherSourcePort', () => {
  it('U-ADAPT-5 a fake adapter implementing the port is accepted by code typed on the port', async () => {
    expect(await countDays(new ConstantWeatherAdapter())).toBe(3);
  });
});
