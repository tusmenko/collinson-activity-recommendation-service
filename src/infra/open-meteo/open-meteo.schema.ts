import { z } from 'zod';

// Pinned Open-Meteo payloads, schema version OPEN_METEO_SCHEMA_VERSION. Unknown keys are ignored.

// Archive days and inland marine points carry nulls, so every series element is nullable.
const series = z.array(z.number().nullable());

const GeocodingHitSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  timezone: z.string(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  admin1: z.string().optional(),
  population: z.number().optional(),
  feature_code: z.string().optional(),
});

// /v1/search. An unknown name comes back as 200 without a `results` key.
export const GeocodingPayloadSchema = z.object({
  results: z.array(GeocodingHitSchema).optional(),
});

export type GeocodingPayload = z.infer<typeof GeocodingPayloadSchema>;

// /v1/forecast.
export const ForecastPayloadSchema = z.object({
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

export type ForecastPayload = z.infer<typeof ForecastPayloadSchema>;

// /v1/marine. Inland points come back with the time axis and every value null.
export const MarinePayloadSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  elevation: z.number().optional(),
  daily: z.object({
    time: z.array(z.iso.date()),
    wave_height_max: series,
    wave_period_max: series,
    swell_wave_height_max: series,
  }),
});

export type MarinePayload = z.infer<typeof MarinePayloadSchema>;
