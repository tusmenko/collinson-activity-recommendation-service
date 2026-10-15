export const SOURCES = ['FORECAST', 'MARINE'] as const;

// Pinned Open-Meteo payload schemas; a provider shape change is a new version and a new key prefix (R-9).
export const FORECAST_SCHEMA_VERSION = 'v1';
export const MARINE_SCHEMA_VERSION = 'v1';

// Seconds a client is told to wait after UPSTREAM_UNAVAILABLE.
export const FORECAST_RETRY_AFTER_SECONDS = 30;

// Operational keys (design D-4).
export const LAST_ERROR_TTL_MS = 7 * 86_400_000;
export const FAIR_USE_COUNTER_TTL_MS = 2 * 86_400_000;

// Queues (design D-5). Concurrency lets sources and locations run side by side; the limiter, not
// the concurrency, caps outbound calls.
export const INGEST_QUEUE = 'ingest';
export const ENRICH_QUEUE = 'enrich';
export const INGEST_CONCURRENCY = 16;
export const INGEST_BACKOFF_MS = 250;
// Each awaited job adds listeners on the Queue and on QueueEvents; Node's default of 10 warns at
// the eleventh concurrent waiter.
export const MAX_WAIT_LISTENERS = 100;
