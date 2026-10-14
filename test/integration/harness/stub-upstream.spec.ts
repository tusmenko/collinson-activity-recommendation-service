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

  it('harness behaviour selected by a /stub/<behaviour> path prefix', async () => {
    const response = await fetch(`${stub.url}/stub/http500/v1/search?name=London`);

    expect(response.status).toBe(500);
  });

  it('harness geocoding serves the fixture for a known name, case-insensitively', async () => {
    const response = await fetch(`${stub.url}/v1/search?name=LONDON`);

    const body = (await response.json()) as { results: unknown[] };

    expect(body.results[0]).toMatchObject({ name: 'London', country_code: 'GB' });
  });

  it('harness forecast serves the nearest fixture within half a degree', async () => {
    const response = await fetch(`${stub.url}/v1/forecast?latitude=51.6&longitude=-0.4`);

    expect(await response.json()).toMatchObject({ timezone: 'Europe/London' });
  });

  it('harness forecast more than half a degree from every fixture answers 404', async () => {
    const response = await fetch(`${stub.url}/v1/forecast?latitude=52.2&longitude=-0.13`);

    expect(response.status).toBe(404);
  });

  it('harness malformed forecast drops daily.temperature_2m_max only', async () => {
    const response = await fetch(
      `${stub.url}/v1/forecast?latitude=51.5&longitude=-0.1&stub=malformed`,
    );
    const body = (await response.json()) as { daily: Record<string, unknown> };

    expect(body.daily).not.toHaveProperty('temperature_2m_max');
    expect(body.daily).toHaveProperty('temperature_2m_min');
  });

  it('harness malformed marine drops daily.wave_height_max only', async () => {
    const response = await fetch(
      `${stub.url}/v1/marine?latitude=43.5&longitude=-1.5&stub=malformed`,
    );
    const body = (await response.json()) as { daily: Record<string, unknown> };

    expect(body.daily).not.toHaveProperty('wave_height_max');
    expect(body.daily).toHaveProperty('wave_period_max');
  });

  it('harness malformed geocoding answers a result with a numeric name', async () => {
    const response = await fetch(`${stub.url}/v1/search?name=London&stub=malformed`);

    expect(await response.json()).toEqual({ results: [{ name: 1 }] });
  });

  it('harness records each request path and query', async () => {
    await fetch(`${stub.url}/v1/search?name=Paris`);

    expect(stub.requests.at(-1)).toBe('/v1/search?name=Paris');
  });

  it('harness without date shifting serves the recorded dates', async () => {
    const response = await fetch(`${stub.url}/v1/forecast?latitude=37.2&longitude=-93.3`);
    const body = (await response.json()) as { daily: { time: string[] } };

    expect(body.daily.time[0]).toBe('2026-10-14');
  });
});

describe('harness stub upstream with date shifting', () => {
  let shifted: StubUpstream;

  beforeAll(async () => {
    shifted = await startStubUpstream(0, { shiftDates: true });
  });

  afterAll(async () => {
    await shifted.close();
  });

  it('harness shiftDates moves daily and hourly time so the first day is today in UTC', async () => {
    const today = new Date().toISOString().slice(0, 10);

    const response = await fetch(`${shifted.url}/v1/forecast?latitude=37.2&longitude=-93.3`);
    const body = (await response.json()) as {
      daily: { time: string[] };
      hourly: { time: string[] };
    };

    expect(body.daily.time).toHaveLength(8);
    expect(body.daily.time[0]).toBe(today);
    expect(body.hourly.time[0]).toBe(`${today}T00:00`);
    expect(body.hourly.time[24]?.slice(0, 10)).toBe(body.daily.time[1]);
  });

  it('harness shiftDates leaves the marine day count and values intact', async () => {
    const response = await fetch(`${shifted.url}/v1/marine?latitude=43.5&longitude=-1.5`);
    const body = (await response.json()) as {
      daily: { time: string[]; wave_height_max: number[] };
    };

    expect(body.daily.time).toHaveLength(8);
    expect(body.daily.wave_height_max[0]).toBe(1.68);
  });
});
