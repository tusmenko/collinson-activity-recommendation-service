import { describe, expect, it } from 'vitest';

import { at, failureOf } from './open-meteo.util';

function named(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe('Open-Meteo shared helpers', () => {
  it('U-ADAPT-6 a timeout or abort is reason timeout', () => {
    expect(failureOf(named('TimeoutError', 'took too long'))).toEqual({
      kind: 'failed',
      reason: 'timeout',
      detail: 'took too long',
    });
    expect(failureOf(named('AbortError', 'aborted'))).toMatchObject({ reason: 'timeout' });
  });

  it('U-ADAPT-12 a body that is not JSON is reason malformed', () => {
    expect(failureOf(new SyntaxError('Unexpected token'))).toMatchObject({
      reason: 'malformed',
      detail: 'Unexpected token',
    });
  });

  it('U-ADAPT-14 any other failure, thrown error or not, is reason network', () => {
    expect(failureOf(new TypeError('fetch failed'))).toMatchObject({
      reason: 'network',
      detail: 'fetch failed',
    });
    expect(failureOf('socket hang up')).toMatchObject({
      reason: 'network',
      detail: 'socket hang up',
    });
  });

  it('U-ADAPT-14 a series value past the end or null reads as null', () => {
    expect(at([1.5, null], 0)).toBe(1.5);
    expect(at([1.5, null], 1)).toBeNull();
    expect(at([1.5, null], 2)).toBeNull();
  });
});
