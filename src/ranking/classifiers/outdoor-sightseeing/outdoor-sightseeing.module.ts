import { Module } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';

import { EngineModule } from '../../engine/engine.module';
import { ClassifierRegistry } from '../../registry/classifier-registry.service';
import { RegistryModule } from '../../registry/registry.module';
import { OutdoorSightseeingClassifier } from './outdoor-sightseeing.classifier';

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
