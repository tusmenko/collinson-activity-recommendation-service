import type { Env } from './env.schema';

// Built by a factory from the validated environment, so the rest of the app never reads process.env.
export class ConfigService {
  constructor(private readonly env: Env) {}

  get<Key extends keyof Env>(key: Key): Env[Key] {
    return this.env[key];
  }
}
