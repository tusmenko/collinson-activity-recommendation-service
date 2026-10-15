import { describe, expect, it } from 'vitest';

import type { MarinePayload } from '../../../infra/index';
import { toDaySignals } from './open-meteo-marine.util';

const BODY: MarinePayload = {
  latitude: 43.5,
  longitude: -1.6,
  timezone: 'Europe/Paris',
  daily: {
    time: ['2026-10-15', '2026-10-16'],
    wave_height_max: [1.6, null],
    wave_period_max: [11.2, null],
    swell_wave_height_max: [1.3],
  },
};

describe('marine normalisation', () => {
  it('U-ADAPT-3 wave series map to wave signals; every weather signal stays null', () => {
    const [first] = toDaySignals(BODY);
    if (first === undefined) {
      throw new Error('expected a first day');
    }
    const { date, waveHeight, wavePeriod, swellHeight, ...weather } = first;

    expect({ date, waveHeight, wavePeriod, swellHeight }).toEqual({
      date: '2026-10-15',
      waveHeight: 1.6,
      wavePeriod: 11.2,
      swellHeight: 1.3,
    });
    expect(Object.values(weather).every((value) => value === null)).toBe(true);
  });

  it('U-ADAPT-3 inland nulls and short series normalise to null waves, not an error', () => {
    const [, second] = toDaySignals(BODY);

    expect(second).toMatchObject({ waveHeight: null, wavePeriod: null, swellHeight: null });
  });
});
