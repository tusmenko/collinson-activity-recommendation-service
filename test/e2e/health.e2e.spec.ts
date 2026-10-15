import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './setup/create-test-app';
import type { TestApp } from './setup/create-test-app';

describe('harness e2e health over HTTP', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it.each(['/health/ready', '/health'])(
    'harness GET %s answers 200 with Redis and memory, status and details only',
    async (path) => {
      const response = await fetch(`${testApp.url}${path}`);

      expect(response.status).toBe(200);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toMatchObject({
        status: 'ok',
        details: { redis: { status: 'up' }, memory_heap: { status: 'up' } },
      });
      expect(Object.keys(body).sort()).toEqual(['details', 'status']);
    },
  );

  it('harness GET /health/live answers 200 without checking a dependency', async () => {
    const response = await fetch(`${testApp.url}/health/live`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', details: {} });
  });
});
