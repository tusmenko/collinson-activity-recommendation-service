import { z } from 'zod';

// Open-Meteo /v1/search, schema version v1 (GEOCODING_SCHEMA_VERSION). Unknown keys are ignored.
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

// An unknown name comes back as 200 without a `results` key.
export const OpenMeteoGeocodingSchema = z.object({
  results: z.array(GeocodingHitSchema).optional(),
});

export type OpenMeteoGeocoding = z.infer<typeof OpenMeteoGeocodingSchema>;
