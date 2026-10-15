import { Module } from '@nestjs/common';

import { QueueModule } from '../queue/queue.module';
import { SourcesModule } from '../sources/sources.module';
import { StoreModule } from '../store/store.module';
import { IngestProcessor } from './ingest.processor';
import { IngestService } from './ingest.service';
import { WindowService } from './window.service';

@Module({
  imports: [SourcesModule, StoreModule, QueueModule],
  providers: [WindowService, IngestService, IngestProcessor],
  exports: [WindowService, IngestService],
})
export class IngestModule {}
