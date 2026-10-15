import { Module } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';

import { EngineModule } from '../../engine/engine.module';
import { ClassifierRegistry } from '../../registry/classifier-registry.service';
import { RegistryModule } from '../../registry/registry.module';
import { SkiingClassifier } from './skiing.classifier';

@Module({
  imports: [EngineModule, RegistryModule],
  providers: [SkiingClassifier],
})
export class SkiingModule implements OnModuleInit {
  constructor(
    private readonly registry: ClassifierRegistry,
    private readonly classifier: SkiingClassifier,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.classifier);
  }
}
