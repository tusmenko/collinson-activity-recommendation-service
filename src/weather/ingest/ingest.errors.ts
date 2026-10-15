// An adapter returned a failed outcome; thrown inside the job so BullMQ retries it.
export class IngestFailedError extends Error {
  constructor(
    readonly reason: string,
    readonly detail: string,
  ) {
    super(`${reason}: ${detail}`);
    this.name = 'IngestFailedError';
  }
}

// OUTBOUND_PER_DAY reached for the UTC day; the job fails without an upstream call.
export class FairUseExceededError extends Error {
  constructor(readonly limit: number) {
    super(`fair-use daily limit of ${String(limit)} outbound calls reached`);
    this.name = 'FairUseExceededError';
  }
}
