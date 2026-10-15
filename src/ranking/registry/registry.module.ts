import { Module } from '@nestjs/common';
import type { DynamicModule, Type } from '@nestjs/common';

import { EngineModule } from '../engine/engine.module';
import { ClassifierRegistry } from './classifier-registry.service';
import type { Classifier } from './classifier.port';

// One helper for every classifier (design D-6): the given classes become providers, and the registry is constructed
// with their instances, so it is complete before anything reads it.
@Module({})
export class RegistryModule {
  static register(classifiers: readonly Type<Classifier>[]): DynamicModule {
    return {
      module: RegistryModule,
      imports: [EngineModule],
      providers: [
        ...classifiers,
        {
          provide: ClassifierRegistry,
          inject: [...classifiers],
          useFactory: (...instances: Classifier[]): ClassifierRegistry =>
            new ClassifierRegistry(instances),
        },
      ],
      exports: [ClassifierRegistry],
    };
  }
}
