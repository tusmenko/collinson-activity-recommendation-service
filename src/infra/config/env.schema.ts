import { z } from 'zod';

const UNIT_MS: Readonly<Record<string, number>> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/;

const duration = z.string().transform((value, context): number => {
  const [, amount = '', unit = ''] = DURATION_PATTERN.exec(value) ?? [];
  const unitMs = UNIT_MS[unit];
  if (unitMs === undefined) {
    context.addIssue({ code: 'custom', message: `expected a duration such as 6h, got "${value}"` });
    return z.NEVER;
  }
  return Number(amount) * unitMs;
});

const count = z.coerce.number().int().positive();
const httpUrl = z.url({ protocol: /^https?$/ });

const EnvSchema = z
  .object({
    PORT: z.coerce.number().int().min(0).max(65_535).prefault('3000'),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }).prefault('redis://redis:6379'),
    UPSTREAM_GEOCODING_URL: httpUrl.prefault('https://geocoding-api.open-meteo.com'),
    UPSTREAM_FORECAST_URL: httpUrl.prefault('https://api.open-meteo.com'),
    UPSTREAM_MARINE_URL: httpUrl.prefault('https://marine-api.open-meteo.com'),
    WINDOW_DAYS: count.prefault('7'),
    FETCH_DAYS: count.prefault('8'),
    FRESHNESS_TTL: duration.prefault('6h'),
    RETENTION_TTL: duration.prefault('24h'),
    UPSTREAM_TIMEOUT_MS: count.prefault('2000'),
    UPSTREAM_RETRIES: z.coerce.number().int().min(0).prefault('1'),
    COLD_READ_BOUND_MS: count.prefault('4500'),
    OUTBOUND_PER_MINUTE: count.prefault('500'),
    // Test knob for the limiter window; production keeps the one-minute default.
    OUTBOUND_LIMIT_WINDOW_MS: count.prefault('60000'),
    OUTBOUND_PER_DAY: count.prefault('9000'),
    INBOUND_PER_MINUTE: count.prefault('60'),
    QUERY_MAX_LOCATIONS: count.prefault('5'),
    GEOCODE_TTL: duration.prefault('30d'),
    QUEUE_PROCESSORS_ENABLED: z.stringbool().prefault('true'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .prefault('info'),
    OTEL_EXPORTER: z.enum(['console', 'otlp']).prefault('console'),
  })
  .superRefine((env, context) => {
    if (env.RETENTION_TTL <= env.FRESHNESS_TTL) {
      context.addIssue({
        code: 'custom',
        path: ['RETENTION_TTL'],
        message: 'must exceed FRESHNESS_TTL',
      });
    }
    if (env.FETCH_DAYS <= env.WINDOW_DAYS) {
      context.addIssue({
        code: 'custom',
        path: ['FETCH_DAYS'],
        message: 'must exceed WINDOW_DAYS',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues.map(
    (issue) => `${issue.path.map(String).join('.')}: ${issue.message}`,
  );
  throw new Error(`Invalid environment: ${problems.join('; ')}`);
}
