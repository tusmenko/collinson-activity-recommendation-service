import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './setup/create-test-app.js';
import type { TestApp } from './setup/create-test-app.js';

describe('harness e2e health over HTTP', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('harness GET /health answers 200 with status and details only', async () => {
    const response = await fetch(`${testApp.url}/health`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      status: 'ok',
      details: { redis: { status: 'up' }, memory_heap: { status: 'up' } },
    });
    expect(Object.keys(body).sort()).toEqual(['details', 'status']);
  });
});
