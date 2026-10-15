import type { ForecastPayload } from '../../../infra/index';
import type { DaySignals } from '../../weather.types';
import { at } from '../open-meteo.util';
import { CM_PER_M, SECONDS_PER_HOUR } from './forecast.const';

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

// Hourly snow depth (m) reduced to a daily maximum (cm) keyed by local date.
function dailySnowDepthCm(hourly: ForecastPayload['hourly']): Map<string, number> {
  const maxima = new Map<string, number>();
  hourly.time.forEach((stamp, index) => {
    const depth = hourly.snow_depth[index];
    const date = stamp.slice(0, 10);
    if (depth !== null && depth !== undefined) {
      maxima.set(date, Math.max(maxima.get(date) ?? depth, depth));
    }
  });
  return new Map([...maxima].map(([date, metres]) => [date, oneDecimal(metres * CM_PER_M)]));
}

export function toDaySignals(payload: ForecastPayload): DaySignals[] {
  const { daily } = payload;
  const snowDepth = dailySnowDepthCm(payload.hourly);
  return daily.time.map((date, index) => {
    const sunshineSeconds = at(daily.sunshine_duration, index);
    return {
      date,
      tempMax: at(daily.temperature_2m_max, index),
      tempMin: at(daily.temperature_2m_min, index),
      precipitation: at(daily.precipitation_sum, index),
      precipitationProbability: at(daily.precipitation_probability_max, index),
      snowfall: at(daily.snowfall_sum, index),
      snowDepth: snowDepth.get(date) ?? null,
      windMax: at(daily.wind_speed_10m_max, index),
      windGusts: at(daily.wind_gusts_10m_max, index),
      cloudCover: at(daily.cloud_cover_mean, index),
      uvIndex: at(daily.uv_index_max, index),
      sunshineHours:
        sunshineSeconds === null ? null : oneDecimal(sunshineSeconds / SECONDS_PER_HOUR),
      visibility: at(daily.visibility_mean, index),
      weatherCode: at(daily.weather_code, index),
      waveHeight: null,
      wavePeriod: null,
      swellHeight: null,
    };
  });
}
