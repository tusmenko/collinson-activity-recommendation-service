// Real Open-Meteo hosts, used unless UPSTREAM_BASE_URL points the whole provider elsewhere (design D-2).
export const OPEN_METEO_HOSTS = {
  geocoding: 'https://geocoding-api.open-meteo.com',
  forecast: 'https://api.open-meteo.com',
  marine: 'https://marine-api.open-meteo.com',
} as const;
