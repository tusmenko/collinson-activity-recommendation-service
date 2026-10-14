import { Global, Module } from '@nestjs/common';

import { ClockPort } from './clock.port.js';
import { SystemClock } from './system-clock.service.js';

@Global()
@Module({
  providers: [{ provide: ClockPort, useClass: SystemClock }],
  exports: [ClockPort],
})
export class ClockModule {}
