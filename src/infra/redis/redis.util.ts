import type { BullClosable, CloseOutcome } from './redis.types';

// True when the promise resolves within `ms`; a rejection or the bound expiring is false. The timer is
// cleared whichever side wins and the promise's rejection is always handled, so nothing dangles.
export async function resolvesWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<false>((resolve) => {
    timer = setTimeout(() => {
      resolve(false);
    }, ms);
  });
  const settled = promise.then(
    () => true,
    () => false,
  );
  try {
    return await Promise.race([settled, expired]);
  } finally {
    clearTimeout(timer);
  }
}

// Bounded shutdown of a BullMQ connection. A connection that never became ready is not closed gracefully
// (BullMQ would wait for it forever); one whose close does not finish within `ms` is dropped instead. Never throws.
export async function closeWithin(target: BullClosable, ms: number): Promise<CloseOutcome> {
  const ready = await resolvesWithin(target.waitUntilReady(), 0);
  if (ready && (await resolvesWithin(target.close(), ms))) {
    return 'closed';
  }
  await resolvesWithin(target.getBackend().close(true), ms);
  return 'forced';
}
