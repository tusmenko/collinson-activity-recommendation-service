import { pino } from 'pino';
import { describe, expect, it } from 'vitest';

import { AppLogger } from './app-logger.service';

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = {
    write(line: string): void {
      lines.push(JSON.parse(line) as Record<string, unknown>);
    },
  };
  return { logger: new AppLogger(pino({ level: 'trace' }, stream)), lines };
}

describe('AppLogger', () => {
  it('U-INFRA-5 each Nest level maps to its pino level', () => {
    const { logger, lines } = capture();

    logger.verbose('v');
    logger.debug('d');
    logger.log('l');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');

    expect(lines.map(({ level, msg }) => [level, msg])).toEqual([
      [10, 'v'],
      [20, 'd'],
      [30, 'l'],
      [40, 'w'],
      [50, 'e'],
      [60, 'f'],
    ]);
  });

  it('U-INFRA-5 a trailing string parameter is the Nest context', () => {
    const { logger, lines } = capture();

    logger.log('Mapped {/health, GET} route', 'RouterExplorer');

    expect(lines[0]).toMatchObject({
      context: 'RouterExplorer',
      msg: 'Mapped {/health, GET} route',
    });
  });

  it('U-INFRA-5 without a string context, none is recorded', () => {
    const { logger, lines } = capture();

    logger.log('no context');
    logger.error('stack follows', { code: 7 });

    expect(lines[0]).not.toHaveProperty('context');
    expect(lines[1]).not.toHaveProperty('context');
  });

  it('U-INFRA-5 a non-string message is logged as detail', () => {
    const { logger, lines } = capture();

    logger.warn({ reason: 'slow' }, 'Scheduler');

    expect(lines[0]).toMatchObject({ level: 40, context: 'Scheduler', detail: { reason: 'slow' } });
    expect(lines[0]).not.toHaveProperty('msg');
  });

  it('U-INFRA-5 the underlying pino logger is exposed for child loggers', () => {
    const { logger } = capture();

    expect(typeof logger.pino.child).toBe('function');
  });
});
