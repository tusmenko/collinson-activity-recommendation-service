import { z } from 'zod';

// Archive days carry nulls (precipitation_probability_max), so every series element is nullable.
const series = z.array(z.number().nullable());

// Open-Meteo /v1/forecast, schema version v1 (FORECAST_SCHEMA_VERSION). Unknown keys are ignored.
export const OpenMeteoForecastSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  elevation: z.number().optional(),
  daily: z.object({
    time: z.array(z.iso.date()),
    weather_code: series,
    temperature_2m_max: series,
    temperature_2m_min: series,
    precipitation_sum: series,
    snowfall_sum: series,
    precipitation_probability_max: series,
    wind_speed_10m_max: series,
    wind_gusts_10m_max: series,
    cloud_cover_mean: series,
    uv_index_max: series,
    sunshine_duration: series,
    visibility_mean: series,
  }),
  hourly: z.object({
    // Local time, YYYY-MM-DDTHH:MM.
    time: z.array(z.string()),
    // Metres.
    snow_depth: series,
  }),
});

export type OpenMeteoForecast = z.infer<typeof OpenMeteoForecastSchema>;
