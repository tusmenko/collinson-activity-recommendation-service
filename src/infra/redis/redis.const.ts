export const REDIS_DEFAULT_PORT = 6379;

// Shutdown waits this long for QUIT; a Redis that is away never answers, and SIGTERM must still exit.
export const REDIS_QUIT_TIMEOUT_MS = 5_000;
export const REDIS_QUIT_FORCED = `QUIT not answered within ${String(REDIS_QUIT_TIMEOUT_MS)} ms; disconnecting`;
