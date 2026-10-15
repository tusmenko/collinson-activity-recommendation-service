import type { Series } from './sources.types';

export function at(values: Series, index: number): number | null {
  return values[index] ?? null;
}
