import { ClockPort } from '../../../src/infra/index.js';
import { FIXED_NOW } from '../fixed-clock.js';

// A clock the test moves forward, for window changes across local midnight.
export class ManualClock extends ClockPort {
  private instant: number;

  constructor(start: Date = FIXED_NOW) {
    super();
    this.instant = start.getTime();
  }

  now(): Date {
    return new Date(this.instant);
  }

  advance(ms: number): void {
    this.instant += ms;
  }

  reset(start: Date = FIXED_NOW): void {
    this.instant = start.getTime();
  }
}
