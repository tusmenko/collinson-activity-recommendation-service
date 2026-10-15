import { Module } from '@nestjs/common';

import { IngestQueue } from './ingest.queue';

@Module({
  providers: [IngestQueue],
  exports: [IngestQueue],
})
export class QueueModule {}
