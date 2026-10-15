import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ConfigService, InfraModule } from '../../../src/infra/index';
import {
  FactsRepositoryPort,
  GeocodingUnavailableError,
  LocationModule,
  LocationNotFoundError,
  LocationService,
} from '../../../src/location/index';
import type { MarineAvailability, ResolvedLocation } from '../../../src/location/index';
import { testConfig } from '../../setup/adapter-deps';
import { createTestRedis, flushTestKeys } from '../../setup/redis';
import { startStubUpstream } from '../../stub-upstream/server';
import type { StubUpstream } from '../../stub-upstream/server';

// The module as Nest wires it: real adapter against the stub, real repository against Redis.
describe('LocationModule wiring', () => {
  let stub: StubUpstream;
  let redis: Redis;
  let moduleRef: TestingModule;

  // RedisModule quits its client on close, so every compiled module gets its own.
  async function compile(behaviour: string, client: Redis): Promise<TestingModule> {
    const config = testConfig({ UPSTREAM_BASE_URL: `${stub.url}/stub/${behaviour}` });
    return Test.createTestingModule({ imports: [InfraModule, LocationModule] })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(Redis)
      .useValue(client)
      .compile();
  }

  beforeAll(async () => {
    stub = await startStubUpstream(0);
    redis = createTestRedis();
    moduleRef = await compile('ok', redis);
  });

  afterAll(async () => {
    await flushTestKeys(redis);
    await moduleRef.close();
    await stub.close();
  });

  it('U-LOC-10 resolves Springfield through the stub and stores its facts in Redis', async () => {
    const resolved: ResolvedLocation = await moduleRef.get(LocationService).resolve('Springfield');

    expect(resolved.location.admin1).toBe('Missouri');
    expect(resolved.alternatives).toHaveLength(4);
    const stored = await moduleRef.get(FactsRepositoryPort).getLocation(resolved.location.id);
    expect(stored).toEqual(resolved.location);
  });

  it('U-LOC-10 a stored marine availability is read back through the exported port', async () => {
    const { location } = await moduleRef.get(LocationService).resolve('Biarritz');
    const available: MarineAvailability = 'available';

    await moduleRef.get(FactsRepositoryPort).setMarineAvailability(location.id, available);

    const again = await moduleRef.get(LocationService).resolve('Biarritz');
    expect(again.location.marineDataAvailable).toBe('available');
  });

  it('U-LOC-10 an unknown name rejects with LocationNotFoundError', async () => {
    await expect(moduleRef.get(LocationService).resolve('Xyzzyqq')).rejects.toBeInstanceOf(
      LocationNotFoundError,
    );
  });

  it('U-LOC-10 a failing upstream rejects with GeocodingUnavailableError', async () => {
    const failing = await compile('http500', createTestRedis());

    await expect(failing.get(LocationService).resolve('Atlantis')).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
    await failing.close();
  });
});
