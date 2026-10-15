import { Module } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';

import { EngineModule } from '../../engine/engine.module.js';
import { ClassifierRegistry } from '../../registry/classifier-registry.service.js';
import { RegistryModule } from '../../registry/registry.module.js';
import { OutdoorSightseeingClassifier } from './outdoor-sightseeing.classifier.js';

@Module({
  imports: [EngineModule, RegistryModule],
  providers: [OutdoorSightseeingClassifier],
})
export class OutdoorSightseeingModule implements OnModuleInit {
  constructor(
    private readonly registry: ClassifierRegistry,
    private readonly classifier: OutdoorSightseeingClassifier,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.classifier);
  }
}
