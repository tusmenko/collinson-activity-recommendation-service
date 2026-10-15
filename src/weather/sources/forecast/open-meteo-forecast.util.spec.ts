import { describe, expect, it } from 'vitest';

import type { ForecastPayload } from '../../../infra/index';
import { toDaySignals } from './open-meteo-forecast.util';

function payload(
  daily: Partial<ForecastPayload['daily']>,
  hourly: ForecastPayload['hourly'],
): ForecastPayload {
  const none = [null];
  return {
    latitude: 45.9,
    longitude: 6.9,
    timezone: 'Europe/Paris',
    daily: {
      time: ['2026-10-15'],
      weather_code: [3],
      temperature_2m_max: [12.4],
      temperature_2m_min: none,
      precipitation_sum: none,
      snowfall_sum: none,
      precipitation_probability_max: none,
      wind_speed_10m_max: none,
      wind_gusts_10m_max: none,
      cloud_cover_mean: none,
      uv_index_max: none,
      sunshine_duration: [3_960],
      visibility_mean: none,
      ...daily,
    },
    hourly,
  };
}

describe('forecast normalisation', () => {
  it('U-ADAPT-4 hourly snow depth in metres becomes a daily maximum in cm; null hours are skipped', () => {
    const [day] = toDaySignals(
      payload(
        {},
        {
          time: ['2026-10-15T00:00', '2026-10-15T01:00', '2026-10-15T02:00'],
          snow_depth: [0.12, null, 0.391],
        },
      ),
    );

    expect(day?.snowDepth).toBe(39.1);
  });

  it('U-ADAPT-4 a day with no snow depth hour, or only null hours, has null snow depth', () => {
    const [noHours] = toDaySignals(payload({}, { time: [], snow_depth: [] }));
    const [nullHours] = toDaySignals(
      payload({}, { time: ['2026-10-15T00:00', '2026-10-15T01:00'], snow_depth: [null] }),
    );

    expect(noHours?.snowDepth).toBeNull();
    expect(nullHours?.snowDepth).toBeNull();
  });

  it('U-ADAPT-1 daily series map to signals; sunshine seconds become hours; waves stay null', () => {
    const [day] = toDaySignals(payload({}, { time: [], snow_depth: [] }));

    expect(day).toMatchObject({
      date: '2026-10-15',
      weatherCode: 3,
      tempMax: 12.4,
      tempMin: null,
      sunshineHours: 1.1,
      waveHeight: null,
      wavePeriod: null,
      swellHeight: null,
    });
  });

  it('U-ADAPT-11 a null sunshine duration stays null', () => {
    const [day] = toDaySignals(
      payload({ sunshine_duration: [null] }, { time: [], snow_depth: [] }),
    );

    expect(day?.sunshineHours).toBeNull();
  });
});
