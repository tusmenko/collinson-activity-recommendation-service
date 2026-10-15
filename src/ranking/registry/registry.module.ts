import { Module } from '@nestjs/common';

import { ClassifierRegistry } from './classifier-registry.service';

// Filled by each classifier module on init (design D-6).
@Module({
  providers: [ClassifierRegistry],
  exports: [ClassifierRegistry],
})
export class RegistryModule {}
