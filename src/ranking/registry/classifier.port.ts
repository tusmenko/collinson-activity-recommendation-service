import type { Source } from '../../weather/index.js';
import type { ClassifierInput, ClassifierOutput } from '../ranking.types.js';

// Design D-6. Async so a model-backed classifier fits the same contract (NFR-8).
export abstract class Classifier {
  // Registry key and the GraphQL Activity enum value.
  abstract readonly id: string;
  // Semver; a prompt version for an LLM classifier.
  abstract readonly version: string;
  // Sources the ingest must provide; a failed one makes the activity UNAVAILABLE.
  abstract readonly requires: readonly Source[];
  abstract score(input: ClassifierInput): Promise<ClassifierOutput>;
}
