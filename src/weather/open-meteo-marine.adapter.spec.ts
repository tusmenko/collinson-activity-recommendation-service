import { afterEach, describe, expect, it, vi } from 'vitest';

import { silentLogger, testConfig } from '../../test/setup/adapter-deps.js';
import { FixedClock } from '../../test/setup/fixed-clock.js';
import { OpenMeteoMarineAdapter } from './open-meteo-marine.adapter.js';

const BIARRITZ = { latitude: 43.48055, longitude: -1.55684 };

describe('OpenMeteoMarineAdapter failure mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-ADAPT-12 a marine body that is not JSON is a malformed source, not a throw', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<html>busy</html>')));
    const adapter = new OpenMeteoMarineAdapter(testConfig(), silentLogger(), new FixedClock());

    const outcome = await adapter.fetchDays(BIARRITZ, 8);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed' });
  });

  it('U-ADAPT-13 with UPSTREAM_BASE_URL unset the marine call goes to the real Open-Meteo host', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', (url: URL) => {
      urls.push(url.href);
      return Promise.resolve(new Response('{}'));
    });
    const config = testConfig({ UPSTREAM_BASE_URL: '' });

    await new OpenMeteoMarineAdapter(config, silentLogger(), new FixedClock()).fetchDays(
      BIARRITZ,
      8,
    );

    expect(urls[0]).toMatch(/^https:\/\/marine-api\.open-meteo\.com\/v1\/marine\?/);
  });
});
