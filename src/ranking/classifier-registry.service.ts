import type { Classifier } from './classifier.port.js';

// Activity id to classifier, filled by module registration (design D-6); the GraphQL enum is built from ids().
export class ClassifierRegistry {
  private readonly classifiers = new Map<string, Classifier>();

  register(classifier: Classifier): void {
    if (this.classifiers.has(classifier.id)) {
      throw new Error(`Classifier "${classifier.id}" is already registered`);
    }
    this.classifiers.set(classifier.id, classifier);
  }

  get(id: string): Classifier | undefined {
    return this.classifiers.get(id);
  }

  ids(): string[] {
    return [...this.classifiers.keys()];
  }

  all(): Classifier[] {
    return [...this.classifiers.values()];
  }
}
