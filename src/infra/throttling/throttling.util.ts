// Throttler records count in whole seconds, never negative.
export function toSeconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}
