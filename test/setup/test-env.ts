import { TEST_REDIS_URL } from './redis';

// Nothing listens on port 9 (discard); upstream calls fail locally unless a test points them at the stub.
const UNREACHABLE_UPSTREAM = 'http://127.0.0.1:9';

export type EnvOverrides = Readonly<Record<string, string>>;

export function testEnv(overrides: EnvOverrides = {}): NodeJS.ProcessEnv {
  return {
    PORT: '0',
    REDIS_URL: TEST_REDIS_URL,
    UPSTREAM_BASE_URL: UNREACHABLE_UPSTREAM,
    LOG_LEVEL: 'silent',
    ...overrides,
  };
}
