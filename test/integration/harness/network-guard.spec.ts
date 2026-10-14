import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const server = createServer((_request, response) => {
  response.end('ok');
});

describe('NFR-6 network guard', () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });

  it('NFR-6 blocks an outbound fetch to Open-Meteo', async () => {
    await expect(fetch('https://api.open-meteo.com/')).rejects.toMatchObject({
      cause: {
        message: 'Network guard: outbound connection to api.open-meteo.com blocked in tests',
      },
    });
  });

  it('NFR-6 allows a fetch to a local server', async () => {
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${String(port)}/`);

    expect(await response.text()).toBe('ok');
  });
});
