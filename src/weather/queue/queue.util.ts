import { FairUseExceededError, IngestFailedError } from './queue.errors.js';

// The ingest.run log's outcome label for a job that threw.
export function outcomeOf(error: unknown): string {
  if (error instanceof IngestFailedError) {
    return error.reason;
  }
  return error instanceof FairUseExceededError ? 'fair-use' : 'error';
}
