import type { Classifier } from './classifier.port';

// Activity id to classifier (design D-6), filled at construction from the list registered in RankingModule, so the
// first read sees every classifier; the GraphQL enum is built from ids().
export class ClassifierRegistry {
  private readonly classifiers = new Map<string, Classifier>();

  constructor(classifiers: readonly Classifier[] = []) {
    for (const classifier of classifiers) {
      this.register(classifier);
    }
  }

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

  // Each classifier's bundled rule file by id, in registration order, for the static rule-set provider.
  ruleFiles(): Record<string, unknown> {
    return Object.fromEntries(this.all().map((classifier) => [classifier.id, classifier.ruleFile]));
  }
}
