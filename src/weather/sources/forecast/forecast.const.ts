// Pinned Open-Meteo payload schema; a provider shape change is a new version and a new key prefix (R-9).
export const FORECAST_SCHEMA_VERSION = 'v1';

export const FORECAST_DAILY_VARIABLES = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'snowfall_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'cloud_cover_mean',
  'uv_index_max',
  'sunshine_duration',
  'visibility_mean',
].join(',');

export const SECONDS_PER_HOUR = 3_600;
export const CM_PER_M = 100;
