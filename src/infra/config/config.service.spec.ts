import { describe, expect, it } from 'vitest';

import { testEnv } from '../../../test/setup/test-env';
import { ConfigService } from './config.service';
import { loadEnv } from './env.schema';

describe('ConfigService', () => {
  it('U-INFRA-2 returns each key of the validated environment, defaults included', () => {
    const config = new ConfigService(loadEnv(testEnv({ WINDOW_DAYS: '5', PORT: '4510' })));

    expect(config.get('WINDOW_DAYS')).toBe(5);
    expect(config.get('PORT')).toBe(4510);
    expect(config.get('QUERY_MAX_LOCATIONS')).toBe(5);
    expect(config.get('NODE_ENV')).toBe('production');
  });
});
