import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startStubUpstream } from '../../stub-upstream/server.js';
import type { StubUpstream } from '../../stub-upstream/server.js';

describe('harness stub upstream', () => {
  let stub: StubUpstream;

  beforeAll(async () => {
    stub = await startStubUpstream();
  });

  afterAll(async () => {
    await stub.close();
  });

  it('harness unknown geocoding name answers 200 without a results key', async () => {
    const response = await fetch(`${stub.url}/v1/search?name=Xyzzyqq`);

    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty('results');
  });

  it('harness http500 behaviour selected by query answers 500', async () => {
    const response = await fetch(`${stub.url}/v1/search?name=Xyzzyqq&stub=http500`);

    expect(response.status).toBe(500);
  });

  it('harness http500 behaviour selected by header answers 500', async () => {
    const response = await fetch(`${stub.url}/v1/forecast?latitude=1&longitude=2`, {
      headers: { 'x-stub-behaviour': 'http500' },
    });

    expect(response.status).toBe(500);
  });

  it('harness forecast without a recorded fixture answers 404', async () => {
    const response = await fetch(`${stub.url}/v1/forecast?latitude=1&longitude=2`);

    expect(response.status).toBe(404);
  });

  it('harness unknown behaviour answers 400', async () => {
    const response = await fetch(`${stub.url}/v1/search?name=x&stub=teapot`);

    expect(response.status).toBe(400);
  });
});
