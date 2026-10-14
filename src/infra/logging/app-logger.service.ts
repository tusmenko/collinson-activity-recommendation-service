import type { LoggerService } from '@nestjs/common';
import type { Level, Logger } from 'pino';

// Adapts Nest's logger contract to pino so framework and application logs share one JSON stream.
export class AppLogger implements LoggerService {
  constructor(readonly pino: Logger) {}

  log(message: unknown, ...params: unknown[]): void {
    this.write('info', message, params);
  }

  error(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }

  debug(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]): void {
    this.write('trace', message, params);
  }

  fatal(message: unknown, ...params: unknown[]): void {
    this.write('fatal', message, params);
  }

  // Nest passes the context as the last optional parameter.
  private write(level: Level, message: unknown, params: readonly unknown[]): void {
    const last = params.at(-1);
    const context = typeof last === 'string' ? last : undefined;
    if (typeof message === 'string') {
      this.pino[level]({ context }, message);
    } else {
      this.pino[level]({ context, detail: message });
    }
  }
}
