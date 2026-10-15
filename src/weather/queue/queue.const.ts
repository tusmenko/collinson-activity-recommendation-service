// Queues (design D-5). Concurrency lets sources and locations run side by side; the limiter, not
// the concurrency, caps outbound calls.
export const INGEST_QUEUE = 'ingest';
export const ENRICH_QUEUE = 'enrich';
export const INGEST_CONCURRENCY = 16;
export const INGEST_BACKOFF_MS = 250;
// Each awaited job adds listeners on the Queue and on QueueEvents; Node's default of 10 warns at
// the eleventh concurrent waiter.
export const MAX_WAIT_LISTENERS = 100;

// BullMQ rejects the bound with this message; there is no typed error for it (bullmq 6).
export const TIMED_OUT = 'timed out before finishing';
