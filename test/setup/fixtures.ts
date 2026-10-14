import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));

// Relative to test/fixtures, for example 'open-meteo/v1/geocoding/springfield.json'.
export function loadFixture(relativePath: string): unknown {
  return JSON.parse(readFileSync(`${FIXTURES_DIR}${relativePath}`, 'utf8'));
}
