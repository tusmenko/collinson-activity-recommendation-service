import { describe, expect, it } from 'vitest';

import { loadFixture } from '../../../test/setup/fixtures';
import {
  ForecastPayloadSchema,
  GeocodingPayloadSchema,
  MarinePayloadSchema,
} from './open-meteo.schema';

function without(body: unknown, field: string): unknown {
  const { daily, ...rest } = body as { daily: Record<string, unknown> };
  return {
    ...rest,
    daily: Object.fromEntries(Object.entries(daily).filter(([key]) => key !== field)),
  };
}

describe('Open-Meteo pinned payload schemas', () => {
  it('U-ADAPT-2 the forecast schema accepts the recorded body and rejects one missing a daily field', () => {
    const body = loadFixture('open-meteo/v1/forecast/chamonix.json');

    expect(ForecastPayloadSchema.safeParse(body).success).toBe(true);
    expect(ForecastPayloadSchema.safeParse(without(body, 'temperature_2m_max')).success).toBe(
      false,
    );
  });

  it('U-ADAPT-2 the marine schema accepts the recorded body and rejects one missing a daily field', () => {
    const body = loadFixture('open-meteo/v1/marine/biarritz.json');

    expect(MarinePayloadSchema.safeParse(body).success).toBe(true);
    expect(MarinePayloadSchema.safeParse(without(body, 'wave_height_max')).success).toBe(false);
  });

  it('U-ADAPT-8 the geocoding schema accepts a body without results and rejects a hit without a name', () => {
    expect(GeocodingPayloadSchema.safeParse({ generationtime_ms: 0.1 }).success).toBe(true);
    expect(GeocodingPayloadSchema.safeParse({ results: [{ name: 1 }] }).success).toBe(false);
  });
});
