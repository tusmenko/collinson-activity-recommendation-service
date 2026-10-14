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
});
