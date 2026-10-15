import type { Coordinates, Source } from '../weather.types.js';

export interface IngestJobData {
  readonly locationId: string;
  readonly source: Source;
  readonly coordinates: Coordinates;
}

export type IngestJobResult =
  | { readonly kind: 'completed' }
  | { readonly kind: 'failed'; readonly reason: string }
  // The bound expired while the job was still queued or running; it keeps going.
  | { readonly kind: 'timed-out' };
