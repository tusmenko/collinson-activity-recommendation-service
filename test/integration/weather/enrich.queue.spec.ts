import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';

import { QueueConnection } from '../../../src/infra/index';
import { EnrichQueue } from '../../../src/weather/queue/enrich.queue';
import { captureLogger } from '../../setup/capture-logger';
import { flushQueueKeys, TEST_REDIS_URL } from '../../setup/redis';

const bullPrefix = `test-bull-${randomUUID()}`;
const captured = captureLogger();
const enrich = new EnrichQueue(new QueueConnection(TEST_REDIS_URL, bullPrefix), captured.logger);

describe('EnrichQueue', () => {
  afterAll(async () => {
    await enrich.onModuleDestroy();
    await flushQueueKeys(bullPrefix);
  });

  it('I-QUEUE-4 registers the enrich queue under the connection prefix, with no processor', async () => {
    expect(enrich.queue.name).toBe('enrich');
    expect(enrich.queue.opts.prefix).toBe(bullPrefix);
    await expect(enrich.queue.getWorkersCount()).resolves.toBe(0);
  });

  it('I-QUEUE-4 a queue error is logged at warn instead of crashing the process', () => {
    enrich.queue.emit('error', new Error('connection lost'));

    expect(captured.lines).toEqual([
      expect.objectContaining({ level: 40, context: 'EnrichQueue', msg: 'connection lost' }),
    ]);
  });
});
