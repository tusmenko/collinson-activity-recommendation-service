import { randomUUID } from 'node:crypto';
import { Queue, QueueEvents } from 'bullmq';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { QueueConnection } from '../../../src/infra/index';
import type { Source } from '../../../src/weather/index';
import { IngestQueue } from '../../../src/weather/queue/ingest.queue';
import {
  QUEUE_CLOSE_FORCED,
  QUEUE_CLOSE_TIMEOUT_MS,
  QUEUE_NOT_READY,
  QUEUE_READY_TIMEOUT_MS,
} from '../../../src/weather/queue/queue.const';
import { testConfig } from '../../setup/adapter-deps';
import { captureLogger } from '../../setup/capture-logger';
import { createIngestHarness } from '../../setup/ingest-harness';
import { flushQueueKeys, TEST_REDIS_URL } from '../../setup/redis';
import type { IngestHarness } from '../../setup/ingest-harness';

const LONDON = {
  id: 'test-london',
  latitude: 51.50853,
  longitude: -0.12574,
  timezone: 'Europe/London',
};

function forecastJob(locationId: string): {
  locationId: string;
  source: Source;
  coordinates: { latitude: number; longitude: number };
} {
  return { locationId, source: 'FORECAST', coordinates: LONDON };
}

describe('ingest queue single flight', () => {
  let harness: IngestHarness;

  beforeAll(async () => {
    harness = await createIngestHarness();
  });

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('I-QUEUE-1 five concurrent cold reads of one location make one upstream call', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => harness.service.ensure(LONDON, ['FORECAST'])),
    );

    expect(harness.forecast.calls).toBe(1);
    expect(results.map((result) => result.stale)).toEqual([false, false, false, false, false]);
  });
});

describe('ingest queue limiter', () => {
  let harness: IngestHarness;

  beforeAll(async () => {
    harness = await createIngestHarness({
      OUTBOUND_PER_MINUTE: '5',
      OUTBOUND_LIMIT_WINDOW_MS: '1000',
    });
  });

  afterAll(async () => {
    await harness.close();
  });

  it('I-QUEUE-2 twenty jobs at five per window take more than three windows', async () => {
    const started = performance.now();

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        harness.queue.runOnce(forecastJob(`test-limited-${String(index)}`), 10_000),
      ),
    );

    expect(performance.now() - started).toBeGreaterThan(3_000);
    expect(results.every((result) => result.kind === 'completed')).toBe(true);
    expect(harness.forecast.calls).toBe(20);
  });
});

describe('ingest daily fair-use guard', () => {
  let harness: IngestHarness;

  beforeAll(async () => {
    harness = await createIngestHarness({ OUTBOUND_PER_DAY: '2' });
  });

  afterAll(async () => {
    await harness.close();
  });

  it('I-QUEUE-3 the job past OUTBOUND_PER_DAY fails as fair use without an upstream call', async () => {
    const first = await harness.queue.runOnce(forecastJob('test-day-1'), 4_500);
    const second = await harness.queue.runOnce(forecastJob('test-day-2'), 4_500);

    const third = await harness.queue.runOnce(forecastJob('test-day-3'), 4_500);

    expect([first.kind, second.kind]).toEqual(['completed', 'completed']);
    expect(third.kind).toBe('failed');
    expect(third.kind === 'failed' ? third.reason : '').toMatch(/fair-use/);
    expect(harness.forecast.calls).toBe(2);
  });
});

describe('ingest queue failure paths', () => {
  let harness: IngestHarness;

  beforeAll(async () => {
    harness = await createIngestHarness();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await harness.close();
  });

  it('I-QUEUE-5 an add that rejects is a failed result with the reason, not a throw', async () => {
    vi.spyOn(Queue.prototype, 'add').mockRejectedValueOnce('redis gone');

    const result = await harness.queue.runOnce(forecastJob('test-add-fails'), 1_000);

    expect(result).toEqual({ kind: 'failed', reason: 'redis gone' });
    expect(harness.forecast.calls).toBe(0);
  });

  it('I-QUEUE-5 a queue or events error is logged at warn instead of crashing the process', () => {
    // The queue and its events are private; the error path is reached through the emitter itself.
    const { queue } = harness.queue as unknown as { queue: Queue };

    queue.emit('error', new Error('connection lost'));

    expect(harness.logs).toContainEqual(
      expect.objectContaining({ level: 40, context: 'IngestQueue', msg: 'connection lost' }),
    );
  });
});

// Redis away at boot, as the event stream sees it: waitUntilReady never settles (or rejects). A queue on a
// closed port cannot be closed afterwards (BullMQ's QueueEvents.close awaits the connection), so the
// stream is held back on the test Redis instead and the queue closes cleanly.
describe('ingest queue whose Redis is unreachable at boot', () => {
  const bullPrefix = `test-bull-${randomUUID()}`;
  const captured = captureLogger();
  let queue: IngestQueue;

  beforeEach(() => {
    captured.lines.length = 0;
    queue = new IngestQueue(
      new QueueConnection(TEST_REDIS_URL, bullPrefix),
      testConfig(),
      captured.logger,
    );
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await queue.onModuleDestroy();
  });

  afterAll(async () => {
    await flushQueueKeys(bullPrefix);
  });

  it('I-QUEUE-6 onModuleInit stops waiting after QUEUE_READY_TIMEOUT_MS and warns instead of blocking boot', async () => {
    vi.spyOn(QueueEvents.prototype, 'waitUntilReady').mockReturnValue(new Promise(() => undefined));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const init = queue.onModuleInit();
    await vi.advanceTimersByTimeAsync(QUEUE_READY_TIMEOUT_MS);
    await init;

    expect(vi.getTimerCount()).toBe(0);
    expect(captured.lines).toEqual([
      expect.objectContaining({ level: 40, context: 'IngestQueue', msg: QUEUE_NOT_READY }),
    ]);
  });

  it('I-QUEUE-6 a rejected wait warns the same way, and a ready stream clears the timer silently', async () => {
    // Connected first, with real timers, so the client's own connect timers are not counted below.
    await queue.onModuleInit();
    vi.spyOn(QueueEvents.prototype, 'waitUntilReady').mockRejectedValueOnce(new Error('closed'));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    await queue.onModuleInit();
    const afterRejection = captured.lines.length;
    await queue.onModuleInit();

    expect(afterRejection).toBe(1);
    expect(captured.lines).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

// Redis gone at shutdown: BullMQ's QueueEvents.close() waits for a connection that never comes back.
describe('ingest queue shutdown when a close never settles', () => {
  const bullPrefix = `test-bull-${randomUUID()}`;
  const captured = captureLogger();

  afterAll(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await flushQueueKeys(bullPrefix);
  });

  it('I-QUEUE-7 onModuleDestroy resolves within QUEUE_CLOSE_TIMEOUT_MS, warns and forces the connection closed', async () => {
    const queue = new IngestQueue(
      new QueueConnection(TEST_REDIS_URL, bullPrefix),
      testConfig(),
      captured.logger,
    );
    await queue.onModuleInit();
    vi.spyOn(QueueEvents.prototype, 'close').mockReturnValue(new Promise(() => undefined));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const destroy = queue.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(QUEUE_CLOSE_TIMEOUT_MS);
    await destroy;

    expect(captured.lines).toContainEqual(
      expect.objectContaining({ level: 40, context: 'IngestQueue', msg: QUEUE_CLOSE_FORCED }),
    );
  });
});
