// Open-Meteo host, used unless UPSTREAM_BASE_URL points the whole provider elsewhere (design D-2).
export const OPEN_METEO_MARINE_URL = 'https://marine-api.open-meteo.com';

// Pinned Open-Meteo payload schema; a provider shape change is a new version and a new key prefix (R-9).
export const MARINE_SCHEMA_VERSION = 'v1';

export const MARINE_DAILY_VARIABLES = 'wave_height_max,wave_period_max,swell_wave_height_max';
