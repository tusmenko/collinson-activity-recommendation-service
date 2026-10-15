// The earliest of some ISO 8601 UTC stamps, which compare correctly as text; null when there are none.
export function minIso(stamps: readonly string[]): string | null {
  return stamps.reduce<string | null>(
    (min, stamp) => (min === null || stamp < min ? stamp : min),
    null,
  );
}
