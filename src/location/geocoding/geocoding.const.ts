// Open-Meteo host, used unless UPSTREAM_BASE_URL points the whole provider elsewhere (design D-2).
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com';

// Pinned Open-Meteo geocoding payload schema; a provider shape change is a new version (risk R-9).
export const GEOCODING_SCHEMA_VERSION = 'v1';
