import { Module } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';

import { EngineModule } from '../../engine/engine.module.js';
import { ClassifierRegistry } from '../../registry/classifier-registry.service.js';
import { RegistryModule } from '../../registry/registry.module.js';
import { SkiingClassifier } from './skiing.classifier.js';

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
