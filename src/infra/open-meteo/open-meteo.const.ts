// Real Open-Meteo hosts, used unless UPSTREAM_BASE_URL points the whole provider elsewhere (design D-2).
export const OPEN_METEO_HOSTS = {
  geocoding: 'https://geocoding-api.open-meteo.com',
  forecast: 'https://api.open-meteo.com',
  marine: 'https://marine-api.open-meteo.com',
} as const;

export const OPEN_METEO_PATHS = {
  search: '/v1/search',
  forecast: '/v1/forecast',
  marine: '/v1/marine',
} as const;

// Version of the pinned payload schemas in open-meteo.schema.ts, stored with every window as providerSchemaVersion;
// a provider shape change is a new version (risk R-9).
export const OPEN_METEO_SCHEMA_VERSION = 'v1';

// Hits asked of /v1/search: the place and up to four alternatives.
export const GEOCODING_COUNT = 5;

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

export const FORECAST_HOURLY_VARIABLES = 'snow_depth';

export const MARINE_DAILY_VARIABLES = 'wave_height_max,wave_period_max,swell_wave_height_max';
