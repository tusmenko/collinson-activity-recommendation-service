// Well above the idle heap of the service; a leak trips it long before the container limit.
export const HEAP_LIMIT_BYTES = 512 * 1024 * 1024;

// Below the compose and Docker healthcheck timeouts so a hung Redis reports down instead of timing out the probe.
export const PING_TIMEOUT_MS = 1_000;
