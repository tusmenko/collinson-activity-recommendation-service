export const SOURCES = ['FORECAST', 'MARINE'] as const;

// Pinned Open-Meteo payload schemas; a provider shape change is a new version and a new key prefix (R-9).
export const FORECAST_SCHEMA_VERSION = 'v1';
export const MARINE_SCHEMA_VERSION = 'v1';
