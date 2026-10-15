import { Module } from '@nestjs/common';

import { IngestModule } from './ingest/ingest.module';
import { QueueModule } from './queue/queue.module';
import { SourcesModule } from './sources/sources.module';
import { StoreModule } from './store/store.module';

// The sub-modules are re-exported: callers see the sources, the store, the queues and the ingest service.
@Module({
  imports: [SourcesModule, StoreModule, QueueModule, IngestModule],
  exports: [SourcesModule, StoreModule, QueueModule, IngestModule],
})
export class WeatherModule {}
