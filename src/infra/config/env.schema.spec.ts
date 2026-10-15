import { describe, expect, it } from 'vitest';

import { loadEnv } from './env.schema.js';

const HOUR_MS = 3_600_000;

describe('U-INFRA-2 environment schema', () => {
  it('U-INFRA-2 parses the defaults from an empty environment', () => {
    const env = loadEnv({});

    expect(env).toMatchObject({
      NODE_ENV: 'production',
      PORT: 4510,
      REDIS_URL: 'redis://redis:6379',
      WINDOW_DAYS: 7,
      FETCH_DAYS: 8,
      FRESHNESS_TTL: 6 * HOUR_MS,
      RETENTION_TTL: 24 * HOUR_MS,
      GEOCODE_TTL: 30 * 24 * HOUR_MS,
      OUTBOUND_LIMIT_WINDOW_MS: 60_000,
      QUEUE_PROCESSORS_ENABLED: true,
      LOG_LEVEL: 'info',
      OTEL_EXPORTER: 'console',
    });
  });

  it('U-INFRA-2 leaves UPSTREAM_BASE_URL unset when absent or empty, so adapters use the real hosts', () => {
    expect(loadEnv({}).UPSTREAM_BASE_URL).toBeUndefined();
    expect(loadEnv({ UPSTREAM_BASE_URL: '' }).UPSTREAM_BASE_URL).toBeUndefined();
  });

  it('U-INFRA-2 accepts an http UPSTREAM_BASE_URL', () => {
    const env = loadEnv({ UPSTREAM_BASE_URL: 'http://stub-upstream:8080' });

    expect(env.UPSTREAM_BASE_URL).toBe('http://stub-upstream:8080');
  });

  it('U-INFRA-2 rejects a non-http UPSTREAM_BASE_URL, naming UPSTREAM_BASE_URL', () => {
    expect(() => loadEnv({ UPSTREAM_BASE_URL: 'ftp://example.test' })).toThrow(/UPSTREAM_BASE_URL/);
  });

  it('U-INFRA-2 rejects RETENTION_TTL not above FRESHNESS_TTL, naming RETENTION_TTL', () => {
    expect(() => loadEnv({ RETENTION_TTL: '1h', FRESHNESS_TTL: '6h' })).toThrow(/RETENTION_TTL/);
  });

  it('U-INFRA-2 rejects a non-numeric PORT, naming PORT', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('U-INFRA-2 rejects FETCH_DAYS not above WINDOW_DAYS, naming FETCH_DAYS', () => {
    expect(() => loadEnv({ FETCH_DAYS: '7', WINDOW_DAYS: '7' })).toThrow(/FETCH_DAYS/);
  });

  it('U-INFRA-2 rejects a duration without a unit, naming the key', () => {
    expect(() => loadEnv({ FRESHNESS_TTL: '6' })).toThrow(/FRESHNESS_TTL/);
  });
});
