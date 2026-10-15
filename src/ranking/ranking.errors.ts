// Mapped to BAD_USER_INPUT by the api error filter; the GraphQL enum normally stops it earlier.
export class UnknownActivityError extends Error {
  readonly code = 'BAD_USER_INPUT';

  constructor(readonly activity: string) {
    super(`Unknown activity "${activity}"`);
    this.name = 'UnknownActivityError';
  }
}

// A rule file that fails the schema stops the app at startup, naming the file.
export class InvalidRuleSetError extends Error {
  constructor(
    readonly activity: string,
    detail: string,
  ) {
    super(`Invalid rule set for ${activity}: ${detail}`);
    this.name = 'InvalidRuleSetError';
  }
}
