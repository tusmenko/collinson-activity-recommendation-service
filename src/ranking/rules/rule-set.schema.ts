import { z } from 'zod';

import { SCORABLE_SIGNALS } from './rules.const';

// A band on one signal; an absent bound is open. Strict and inclusive bounds are both needed: D-6.1 says "< 40" and "≥ 30".
const RangeSchema = z
  .object({
    gt: z.number().optional(),
    gte: z.number().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
  })
  .strict()
  .refine((range) => Object.keys(range).length > 0, {
    message: 'a range needs at least one bound',
  });

const FactorRuleSchema = z
  .object({
    signal: z.enum(SCORABLE_SIGNALS),
    unit: z.string().nullable(),
    weight: z.number().positive(),
    // A value inside any good band scores 100, else inside any poor band 0, else 50.
    good: z.array(RangeSchema),
    poor: z.array(RangeSchema),
    note: z.string().min(1),
  })
  .strict();

export const RuleSetSchema = z
  .object({
    version: z.string().min(1),
    // Lowest day score; indoor sightseeing is never poor.
    floor: z.number().min(0).max(100).optional(),
    // A factor this heavy inside its poor band caps the day: one disqualifying signal outweighs the rest.
    poorCap: z
      .object({
        max: z.number().min(0).max(100),
        minWeight: z.number().positive(),
        note: z.string().min(1),
      })
      .strict()
      .optional(),
    // A factor this heavy inside its good band lifts the day to at least `min`, unless poorCap capped it.
    goodBoost: z
      .object({
        min: z.number().min(0).max(100),
        minWeight: z.number().positive(),
        note: z.string().min(1),
      })
      .strict()
      .optional(),
    // Place applicability (ScoreEngine.placeGate, run by every classifier before the gate): below `minElevation`
    // metres, or with no known elevation, the activity is not applicable.
    applicability: z
      .object({ minElevation: z.number(), note: z.string().min(1) })
      .strict()
      .optional(),
    // Applicability: below `min` on every day (or no value) makes the activity not applicable.
    gate: z
      .object({ signal: z.enum(SCORABLE_SIGNALS), min: z.number(), note: z.string().min(1) })
      .strict()
      .optional(),
    factors: z.array(FactorRuleSchema).min(1),
  })
  .strict();

export type RuleSet = z.infer<typeof RuleSetSchema>;
export type FactorRule = RuleSet['factors'][number];
export type Range = FactorRule['good'][number];
