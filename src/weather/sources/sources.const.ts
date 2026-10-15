// Open-Meteo hosts, used unless UPSTREAM_BASE_URL points the whole provider elsewhere (design D-2).
export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com';
export const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com';

// Pinned Open-Meteo payload schemas; a provider shape change is a new version and a new key prefix (R-9).
export const FORECAST_SCHEMA_VERSION = 'v1';
export const MARINE_SCHEMA_VERSION = 'v1';

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
export const MARINE_DAILY_VARIABLES = 'wave_height_max,wave_period_max,swell_wave_height_max';

export const SECONDS_PER_HOUR = 3_600;
export const CM_PER_M = 100;
