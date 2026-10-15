import type { HealthCheckResult } from '@nestjs/terminus';

// Terminus also returns `info` and `error`, which repeat `details` split by outcome.
export type HealthBody = Pick<HealthCheckResult, 'status' | 'details'>;
