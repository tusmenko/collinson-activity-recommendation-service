import { pino } from 'pino';

import { AppLogger } from '../../src/infra/index.js';

export interface CapturedLogger {
  readonly logger: AppLogger;
  // Every JSON line pino wrote, parsed, in order.
  readonly lines: Record<string, unknown>[];
}

// A real pino logger writing into memory, so tests assert on the structured events as emitted.
export function captureLogger(): CapturedLogger {
  const lines: Record<string, unknown>[] = [];
  const stream = {
    write(line: string): void {
      lines.push(JSON.parse(line) as Record<string, unknown>);
    },
  };
  return { logger: new AppLogger(pino({ level: 'info' }, stream)), lines };
}
