import type { ArgumentMetadata } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';

import { ActivitiesSchema, CitySchema, CountrySchema } from './args.schema';
import { ZodArgPipe } from './zod-args.pipe';

const CITY: ArgumentMetadata = { type: 'custom', data: 'city' };

function codeOf(act: () => unknown): unknown {
  try {
    act();
  } catch (error) {
    return error instanceof GraphQLError ? error.extensions.code : error;
  }
  return 'no error';
}

describe('U-API argument validation', () => {
  const city = new ZodArgPipe(CitySchema);

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['81 characters', 'a'.repeat(81)],
    ['punctuation', 'Lond0n;drop'],
  ])('U-API-1 a %s city gives BAD_USER_INPUT', (_label, value) => {
    expect(codeOf(() => city.transform(value, CITY))).toBe('BAD_USER_INPUT');
  });

  it('U-API-1 the error names the argument and lists the issues', () => {
    let caught: unknown;
    try {
      city.transform('Lond0n;drop', CITY);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(GraphQLError);
    expect((caught as GraphQLError).message).toContain('"city"');
    expect((caught as GraphQLError).extensions.issues).toEqual([
      expect.objectContaining({ code: 'invalid_format' }),
    ]);
  });

  it('U-API-2 the pipe passes a valid city trimmed', () => {
    expect(city.transform('  Saint-Jean-de-Luz ', CITY)).toBe('Saint-Jean-de-Luz');
  });

  it.each([
    'Vitória',
    "L'Aquila",
    'L’Aquila',
    'L‘Aquila',
    'Saint-Louis 2',
    'St. Moritz',
    'Zürich',
    '東京',
  ])('U-API-2 %s is a valid city', (value) => {
    expect(city.transform(value, CITY)).toBe(value);
  });

  it('U-API-2 an omitted or null country becomes undefined; a short one is rejected', () => {
    const country = new ZodArgPipe(CountrySchema);
    const metadata: ArgumentMetadata = { type: 'custom', data: 'country' };

    expect(country.transform(null, metadata)).toBeUndefined();
    expect(country.transform(undefined, metadata)).toBeUndefined();
    expect(country.transform(' FR ', metadata)).toBe('FR');
    expect(codeOf(() => country.transform('F', metadata))).toBe('BAD_USER_INPUT');
  });

  it('U-API-1 an empty activities list gives BAD_USER_INPUT; an omitted one means all', () => {
    const activities = new ZodArgPipe(ActivitiesSchema);
    const metadata: ArgumentMetadata = { type: 'custom' };

    expect(codeOf(() => activities.transform([], metadata))).toBe('BAD_USER_INPUT');
    expect(activities.transform(undefined, metadata)).toBeUndefined();
    expect(activities.transform(['SKIING'], metadata)).toEqual(['SKIING']);
  });
});
