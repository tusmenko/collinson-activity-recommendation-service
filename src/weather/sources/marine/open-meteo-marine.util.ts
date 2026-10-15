import type { MarinePayload } from '../../../infra/index';
import type { DaySignals } from '../../weather.types';
import { at } from '../open-meteo.util';

// Inland nulls stay null: absence of marine data is a signal for the classifiers, not an error.
export function toDaySignals({ daily }: MarinePayload): DaySignals[] {
  return daily.time.map((date, index) => ({
    date,
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
    waveHeight: at(daily.wave_height_max, index),
    wavePeriod: at(daily.wave_period_max, index),
    swellHeight: at(daily.swell_wave_height_max, index),
  }));
}
