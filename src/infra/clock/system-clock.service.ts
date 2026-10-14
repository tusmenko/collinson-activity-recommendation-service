import { Injectable } from '@nestjs/common';

import { ClockPort } from './clock.port.js';

@Injectable()
export class SystemClock extends ClockPort {
  now(): Date {
    return new Date();
  }
}
