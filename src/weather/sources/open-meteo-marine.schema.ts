import { z } from 'zod';

// Inland points come back with the time axis and every value null.
const series = z.array(z.number().nullable());

// Open-Meteo /v1/marine, schema version v1 (MARINE_SCHEMA_VERSION). Unknown keys are ignored.
export const OpenMeteoMarineSchema = z.object({
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

export type OpenMeteoMarine = z.infer<typeof OpenMeteoMarineSchema>;
