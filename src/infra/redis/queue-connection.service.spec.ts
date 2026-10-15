import { describe, expect, it } from 'vitest';

import { QueueConnection } from './queue-connection.service.js';

describe('QueueConnection', () => {
  it('U-INFRA-2 takes host, port, database and credentials from REDIS_URL', () => {
    const queue = new QueueConnection('rediss://user:p%40ss@cache.internal:6380/2');

    expect(queue.connection).toEqual({
      host: 'cache.internal',
      port: 6380,
      db: 2,
      username: 'user',
      password: 'p@ss',
      tls: {},
    });
    expect(queue.prefix).toBe('bull');
  });

  it('U-INFRA-2 defaults the port and database of a bare REDIS_URL', () => {
    expect(new QueueConnection('redis://redis', 'custom')).toMatchObject({
      connection: { host: 'redis', port: 6379, db: 0 },
      prefix: 'custom',
    });
  });
});
