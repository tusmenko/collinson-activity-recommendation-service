// The part of a BullMQ Queue, QueueEvents or Worker that a bounded shutdown needs, typed structurally so the
// helper stays free of the client library.
export interface BullClosable {
  waitUntilReady(): Promise<unknown>;
  close(): Promise<void>;
  // force: drop the connection without QUIT and without waiting for it to become ready.
  getBackend(): { close(force?: boolean): Promise<void> };
}

// closed: the graceful close finished in time; forced: the connection was dropped instead.
export type CloseOutcome = 'closed' | 'forced';
