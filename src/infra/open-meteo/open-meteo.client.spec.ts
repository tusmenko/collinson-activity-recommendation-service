import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { openMeteoClient, testConfig } from '../../../test/setup/adapter-deps';
import type { OpenMeteoRequest } from './open-meteo.types';

const Schema = z.object({ value: z.number() });

function request(params = new URLSearchParams({ q: 'a,b' })): OpenMeteoRequest<{ value: number }> {
  return {
    endpoint: 'forecast',
    path: '/v1/forecast',
    params,
    schema: Schema,
    schemaVersion: 'v1',
    label: 'forecast',
  };
}

function answering(response: () => Promise<Response>): string[] {
  const urls: string[] = [];
  vi.stubGlobal('fetch', (url: URL) => {
    urls.push(url.href);
    return response();
  });
  return urls;
}

describe('OpenMeteoClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-ADAPT-1 a body that passes the schema is ok with the parsed data and the raw body', async () => {
    answering(() => Promise.resolve(Response.json({ value: 3, extra: true })));

    const outcome = await openMeteoClient().get(request());

    expect(outcome).toEqual({ kind: 'ok', data: { value: 3 }, raw: { value: 3, extra: true } });
  });

  it('U-ADAPT-2 a body that fails the schema is malformed and keeps the raw body', async () => {
    answering(() => Promise.resolve(Response.json({ value: 'three' })));

    const outcome = await openMeteoClient().get(request());

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed', raw: { value: 'three' } });
  });

  it('U-ADAPT-7 a non-2xx status is reason http with the status', async () => {
    answering(() => Promise.resolve(new Response('busy', { status: 503 })));

    const outcome = await openMeteoClient().get(request());

    expect(outcome).toEqual({ kind: 'failed', reason: 'http', detail: 'HTTP 503' });
  });

  it('U-ADAPT-9 a thrown fetch is a failed outcome, not a throw', async () => {
    answering(() => Promise.reject(new TypeError('fetch failed')));

    const outcome = await openMeteoClient().get(request());

    expect(outcome).toEqual({ kind: 'failed', reason: 'network', detail: 'fetch failed' });
  });

  it('U-ADAPT-13 UPSTREAM_BASE_URL replaces the host and keeps its path; unset, the real host is used', async () => {
    const urls = answering(() => Promise.resolve(Response.json({ value: 1 })));

    await openMeteoClient(testConfig({ UPSTREAM_BASE_URL: 'http://stub:1/stub/ok/' })).get(
      request(),
    );
    await openMeteoClient(testConfig({ UPSTREAM_BASE_URL: '' })).get(request());

    expect(urls).toEqual([
      'http://stub:1/stub/ok/v1/forecast?q=a%2Cb',
      'https://api.open-meteo.com/v1/forecast?q=a%2Cb',
    ]);
  });
});
