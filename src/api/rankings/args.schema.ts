import { z } from 'zod';

// Letters in any script with their combining marks, digits, spaces, hyphens, dots and apostrophes, typographic
// ones (U+2018, U+2019) included (NFR-12).
const PLACE_NAME = /^[\p{L}\p{M}\p{Nd} .'‘’-]+$/u;
const PLACE_NAME_MESSAGE =
  'only letters, digits, spaces, hyphens, apostrophes and dots are allowed';

// GraphQL passes an omitted optional argument as undefined and an explicit null as null; both mean "not given".
function optional<Schema extends z.ZodType>(
  schema: Schema,
): z.ZodType<z.output<Schema> | undefined, z.input<Schema> | null | undefined> {
  return schema.nullish().transform((value) => value ?? undefined);
}

export const CitySchema = z.string().trim().min(1).max(80).regex(PLACE_NAME, PLACE_NAME_MESSAGE);

// A first-level administrative area such as a state or province; same rules as the city.
export const RegionSchema = optional(CitySchema);

export const CountrySchema = optional(
  z.string().trim().min(2).max(56).regex(PLACE_NAME, PLACE_NAME_MESSAGE),
);

// The Activity enum already restricts the values; registry membership is checked by the service.
export const ActivitiesSchema = optional(z.array(z.string()).min(1));

// The validated arguments of Query.activityRankings.
export interface RankingsArgs {
  readonly city: z.output<typeof CitySchema>;
  readonly country: z.output<typeof CountrySchema>;
  readonly region: z.output<typeof RegionSchema>;
  readonly activities: z.output<typeof ActivitiesSchema>;
}
