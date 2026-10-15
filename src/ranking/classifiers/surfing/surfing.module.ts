import { Module } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';

import { EngineModule } from '../../engine/engine.module';
import { ClassifierRegistry } from '../../registry/classifier-registry.service';
import { RegistryModule } from '../../registry/registry.module';
import { SurfingClassifier } from './surfing.classifier';

@Module({
  imports: [EngineModule, RegistryModule],
  providers: [SurfingClassifier],
})
export class SurfingModule implements OnModuleInit {
  constructor(
    private readonly registry: ClassifierRegistry,
    private readonly classifier: SurfingClassifier,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.classifier);
  }
}
