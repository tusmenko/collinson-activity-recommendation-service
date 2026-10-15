import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BullClosable } from './redis.types';
import { closeWithin, resolvesWithin } from './redis.util';

const NEVER = (): Promise<never> => new Promise<never>(() => undefined);

function closable(ready: () => Promise<unknown>, close: () => Promise<void>) {
  const force = vi.fn<(force?: boolean) => Promise<void>>(() => Promise.resolve());
  const graceful = vi.fn(close);
  const target: BullClosable = {
    waitUntilReady: ready,
    close: graceful,
    getBackend: () => ({ close: force }),
  };
  return { target, graceful, force };
}

describe('bounded Redis waits', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('U-INFRA-7 resolvesWithin is true for a resolved promise and false for a rejected one', async () => {
    await expect(resolvesWithin(Promise.resolve('ok'), 1_000)).resolves.toBe(true);
    await expect(resolvesWithin(Promise.reject(new Error('closed')), 1_000)).resolves.toBe(false);
  });

  it('U-INFRA-7 resolvesWithin gives up after the bound and leaves no timer', async () => {
    vi.useFakeTimers();

    const waiting = resolvesWithin(NEVER(), 5_000);
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(waiting).resolves.toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('U-INFRA-7 closeWithin closes a ready connection gracefully', async () => {
    const { target, graceful, force } = closable(
      () => Promise.resolve(),
      () => Promise.resolve(),
    );

    await expect(closeWithin(target, 5_000)).resolves.toBe('closed');
    expect(graceful).toHaveBeenCalledOnce();
    expect(force).not.toHaveBeenCalled();
  });

  it('U-INFRA-7 closeWithin forces the close when the graceful one never settles', async () => {
    vi.useFakeTimers();
    const { target, force } = closable(() => Promise.resolve(), NEVER);

    const closing = closeWithin(target, 5_000);
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(closing).resolves.toBe('forced');
    expect(force).toHaveBeenCalledWith(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('U-INFRA-7 closeWithin skips the graceful close of a connection that never became ready', async () => {
    const { target, graceful, force } = closable(NEVER, NEVER);

    await expect(closeWithin(target, 5_000)).resolves.toBe('forced');
    expect(graceful).not.toHaveBeenCalled();
    expect(force).toHaveBeenCalledWith(true);
  });
});
