import { Injectable } from '@nestjs/common';

import { ClockPort, ConfigService } from '../../infra/index';
import { DAY_MS } from './ingest.const';

// The served window: WINDOW_DAYS local dates starting at today in the location's timezone (FR-2).
@Injectable()
export class WindowService {
  constructor(
    private readonly clock: ClockPort,
    private readonly config: ConfigService,
  ) {}

  dates(timezone: string): string[] {
    // en-CA formats as YYYY-MM-DD; the rest is calendar arithmetic, so UTC avoids DST shifts.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(this.clock.now());
    const start = Date.parse(`${today}T00:00:00Z`);
    return Array.from({ length: this.config.get('WINDOW_DAYS') }, (_, index) =>
      new Date(start + index * DAY_MS).toISOString().slice(0, 10),
    );
  }
}
