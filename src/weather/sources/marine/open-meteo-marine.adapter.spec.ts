import { afterEach, describe, expect, it, vi } from 'vitest';

import { openMeteoClient } from '../../../../test/setup/adapter-deps';
import { OpenMeteoMarineAdapter } from './open-meteo-marine.adapter';

const BIARRITZ = { latitude: 43.48055, longitude: -1.55684 };

describe('OpenMeteoMarineAdapter failure mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('U-ADAPT-12 a marine body that is not JSON is a malformed source, not a throw', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<html>busy</html>')));
    const adapter = new OpenMeteoMarineAdapter(openMeteoClient());

    const outcome = await adapter.fetchDays(BIARRITZ, 8);

    expect(outcome).toMatchObject({ kind: 'failed', reason: 'malformed' });
  });
});
