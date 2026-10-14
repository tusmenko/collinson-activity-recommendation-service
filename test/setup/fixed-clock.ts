import { ClockPort } from '../../src/infra/index.js';

export const FIXED_NOW = new Date('2026-10-15T06:00:00.000Z');

export class FixedClock extends ClockPort {
  constructor(private readonly instant: Date = FIXED_NOW) {
    super();
  }

  now(): Date {
    return new Date(this.instant);
  }
}
