import { Global, Module } from '@nestjs/common';

import { AnomalyCounter } from './anomaly-counter.port';
import { OtelAnomalyCounter } from './otel-anomaly-counter.service';

@Global()
@Module({
  providers: [{ provide: AnomalyCounter, useClass: OtelAnomalyCounter }],
  exports: [AnomalyCounter],
})
export class TelemetryModule {}
