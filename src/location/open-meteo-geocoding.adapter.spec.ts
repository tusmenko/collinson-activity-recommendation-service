import { afterEach, describe, expect, it, vi } from 'vitest';

import { silentLogger, testConfig } from '../../test/setup/adapter-deps.js';
import { OpenMeteoGeocodingAdapter } from './open-meteo-geocoding.adapter.js';

describe('OpenMeteoGeocodingAdapter base URL', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-ADAPT-13 with UPSTREAM_BASE_URL unset the search goes to the real Open-Meteo host', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', (url: URL) => {
      urls.push(url.href);
      return Promise.resolve(new Response('{}'));
    });
    const config = testConfig({ UPSTREAM_BASE_URL: '' });

    await new OpenMeteoGeocodingAdapter(config, silentLogger()).search('Biarritz');

    expect(urls[0]).toMatch(/^https:\/\/geocoding-api\.open-meteo\.com\/v1\/search\?/);
  });
});
